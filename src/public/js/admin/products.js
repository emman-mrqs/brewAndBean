// Client-side JS for Admin Products page
(function(){
  const API_BASE = '/admin/api/products';

  // Utility: create element from HTML
  function el(html){
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content.firstChild;
  }

  function formatCurrency(v){
    if (v == null) return '-';
    // Philippine Peso formatting
    try{
      const n = Number(v);
      return '₱' + new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
    }catch(e){
      return '₱' + Number(v).toFixed(2);
    }
  }

  // client-side state for products, filtering and pagination
  let allProducts = [];
  let filteredProducts = [];
  let currentPage = 1;
  const PAGE_SIZE = 10;
  let searchTerm = '';
  // keep track of the element that triggered the delete modal so we can restore focus
  let lastDeleteModalTrigger = null;

  async function loadProducts(){
    try{
      // Yield to browser before starting heavy operation
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const resp = await fetch(API_BASE, { credentials: 'same-origin' });
      const json = await resp.json();
      if (!json.success) throw new Error(json.message || 'Failed loading products');
      allProducts = json.products || [];
      
      // Use requestAnimationFrame to smoothly update UI
      await new Promise(resolve => {
        requestAnimationFrame(async () => {
          populateCategorySelect();
          await applyFiltersAndRender();
          resolve();
        });
      });
    }catch(err){
      console.error(err);
      showToast('Failed to load products', 'danger');
    }
  }

  async function applyFiltersAndRender(){
    // Use Promise to yield to browser and prevent UI blocking
    await new Promise(resolve => setTimeout(resolve, 0));
    
    const q = (searchTerm || '').trim().toLowerCase();
    if (!q) filteredProducts = allProducts.slice();
    else {
      filteredProducts = allProducts.filter(p => {
        if (!p) return false;
        const name = (p.name || '').toLowerCase();
        const variant = (p.variant_name || '').toLowerCase();
        const id = String(p.id || '').toLowerCase();
        return name.includes(q) || variant.includes(q) || id.includes(q);
      });
    }
    const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;
    
    // Use requestAnimationFrame for smooth rendering
    await renderCurrentPage();
    await renderPagination();
  }

  async function renderCurrentPage(){
    const start = (currentPage - 1) * PAGE_SIZE;
    const pageItems = filteredProducts.slice(start, start + PAGE_SIZE);
    await renderProductsTable(pageItems);
  }

  async function renderProductsTable(products){
    const tbody = document.querySelector('.data-table tbody');
    if (!tbody) return;
    
    // Clear existing content first
    tbody.innerHTML = '';
    
    // Use requestAnimationFrame for smoother rendering
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        // Render products in the tbody
        for(const p of products){
          const tr = document.createElement('tr');
          const imgHtml = p.img_url ? `<img src="${p.img_url}" alt="${escapeHtml(p.name)}" class="product-thumb" style="width:48px;height:48px;border-radius:8px;object-fit:cover;"/>` : `<div class="product-thumb-placeholder" style="width:48px;height:48px;border-radius:8px;display:flex;align-items:center;justify-content:center;background:#f3e9e5">☕</div>`;

          tr.innerHTML = `
            <td>${p.id}</td>
            <td>
              <div class="product-cell">
                ${imgHtml}
                <span>${escapeHtml(p.name || '')}</span>
              </div>
            </td>
      <td>${escapeHtml(p.variant_name || '-')}</td>
      <td>${formatCurrency(p.price)}</td>
      <td>${p.stock_quantity != null ? p.stock_quantity : '-'}</td>
      <td>${p.price != null ? '<span class="status-badge active">Active</span>' : '<span class="status-badge suspended">Draft</span>'}</td>
            <td>
              <div class="action-buttons">
                <button class="btn-icon btn-edit" data-id="${p.id}"><i class="fas fa-edit"></i></button>
                <button class="btn-icon btn-delete" data-id="${p.id}"><i class="fas fa-trash"></i></button>
              </div>
            </td>
          `;

          tbody.appendChild(tr);
        }
        // Event listeners are now handled by delegation in setupEventDelegation() - called once on page load
        resolve();
      });
    });
  }

  // escape minimal
  function escapeHtml(s){
    if (!s) return '';
    return String(s).replace(/[&<>\"]/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
  }

  // Modal helpers
  function createModal(title, innerHtml){
    const overlay = el(`<div class="admin-modal-overlay" style="position:fixed;inset:0;background:rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;z-index:2000;"></div>`);
    const modal = el(`<div class="admin-modal" role="dialog" aria-modal="true" style="background:white;border-radius:10px;max-width:720px;width:100%;box-shadow:0 10px 40px rgba(0,0,0,0.15);"></div>`);
    const header = el(`<div style="padding:16px 20px;border-bottom:1px solid #f2f2f2;display:flex;align-items:center;justify-content:space-between;"><h3 style="margin:0;font-size:1.1rem">${escapeHtml(title)}</h3><button class="modal-close" aria-label="Close" style="background:none;border:none;font-size:18px;padding:8px;cursor:pointer">&times;</button></div>`);
    const body = el(`<div style="padding:18px">${innerHtml}</div>`);
    modal.appendChild(header);
    modal.appendChild(body);
    overlay.appendChild(modal);

    function close(){
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
      document.removeEventListener('keydown', onKey);
    }
    function onKey(e){ if (e.key==='Escape') close(); }
    header.querySelector('.modal-close').addEventListener('click', close);
    overlay.addEventListener('click', (e)=>{ if (e.target===overlay) close(); });
    document.addEventListener('keydown', onKey);

    document.body.appendChild(overlay);
    return { overlay, modal, close, body };
  }

  function openAddModal(){
    // If page contains server-rendered Bootstrap modal, use it; otherwise fallback to dynamic modal
    const bsModalEl = document.getElementById('productModal');
    if (bsModalEl && window.bootstrap && window.bootstrap.Modal) {
      const title = document.getElementById('productModalTitle');
      const form = document.getElementById('productForm');
      const preview = document.getElementById('productFormPreview');
      const submitBtn = document.getElementById('productFormSubmit');
      title.textContent = 'Add Product';
      // clear form
      form.reset();
  clearValidation(form);
      document.getElementById('productFormId').value = '';
      preview.innerHTML = '';

      const bsModal = bootstrap.Modal.getOrCreateInstance(bsModalEl);
      
      // Add cleanup on modal hide
      const cleanupOnHide = () => {
        setTimeout(() => {
          document.body.classList.remove('modal-open');
          document.body.style.overflow = '';
          document.body.style.paddingRight = '';
          const backdrops = document.querySelectorAll('.modal-backdrop');
          backdrops.forEach(bd => {
            if (bd.parentNode) bd.parentNode.removeChild(bd);
          });
        }, 50);
      };
      
      bsModalEl.addEventListener('hidden.bs.modal', cleanupOnHide, { once: true });
      
      bsModal.show();

      const onSubmit = async () => {
        // prevent double clicks by disabling button until done
        submitBtn.disabled = true;
        try{
          const created = await submitCreate(form, { close: () => bsModal.hide() });
          // only clear the click handler if creation actually succeeded
          if (created) {
            submitBtn.onclick = null;
          }
        }finally{
          submitBtn.disabled = false;
        }
      };
      // Ensure previous handlers are cleared to avoid create/update duplication
      submitBtn.onclick = null;
      submitBtn.onclick = async () => {
        await onSubmit();
      };
      return;
    }
    // fallback dynamic modal
    const html = `
      <form id="__addProductForm">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <label style="display:block">Name<input name="name" required class="form-input"/></label>
          <label style="display:block">Price<input name="price" type="number" step="0.01" class="form-input"/></label>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px">
          <label style="display:block">Category (variant name)<input name="variant_name" placeholder="hot, cold, special" class="form-input"/></label>
          <label style="display:block">Quantity<input name="stock_quantity" type="number" min="0" class="form-input"/></label>
        </div>
        <label style="display:block;margin-top:12px">Description<textarea name="description" rows="4" class="form-input"></textarea></label>
        <label style="display:block;margin-top:12px">Image<input name="image" type="file" accept="image/*"></label>
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px">
          <button type="button" class="btn-cancel">Cancel</button>
          <button type="submit" class="btn-primary">Create product</button>
        </div>
      </form>`;
    const m = createModal('Add Product', html);
    const form = m.body.querySelector('form');
    m.body.querySelector('.btn-cancel').addEventListener('click', ()=> m.close());
    form.addEventListener('submit', async (e)=>{
      e.preventDefault();
      await submitCreate(form, m);
    });
  }

  async function submitCreate(form, modalHandle){
    try{
      // ensure variant_name hidden field is set from select/custom
      prepareVariantField(form);
      // client-side validation
      if (!validateProductForm(form)){
        showToast('Please fix the highlighted fields', 'danger');
        return false;
      }
      const fd = new FormData(form);
      const res = await fetch(API_BASE, { method: 'POST', body: fd, credentials: 'same-origin' });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Create failed');
      if (modalHandle) modalHandle.close();
      await loadProducts();
      showToast('Product created', 'success');
      return true;
    }catch(err){
      console.error(err);
      showToast('Failed to create product', 'danger');
      return false;
    }
  }

  // edit via inline editor now; old modal-based edit removed

  async function submitUpdate(id, form, modalHandle){
    try{
      // ensure variant_name hidden field is set from select/custom
      prepareVariantField(form);
      // client-side validation
      if (!validateProductForm(form)){
        showToast('Please fix the highlighted fields', 'danger');
        return;
      }
      const fd = new FormData(form);
      const res = await fetch(`${API_BASE}/${id}`, { method: 'PUT', body: fd, credentials: 'same-origin' });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Update failed');
      if (modalHandle) modalHandle.close();
      await loadProducts();
      showToast('Product updated', 'success');
    }catch(err){
      console.error(err);
      showToast('Failed to update product', 'danger');
    }
  }

  // Validation helpers
  function setInvalid(input, message){
    if (!input) return;
    input.classList.add('is-invalid');
    // find or create feedback
    let fb = input.nextElementSibling;
    if (!fb || !fb.classList || !fb.classList.contains('invalid-feedback')){
      fb = document.createElement('div');
      fb.className = 'invalid-feedback';
      input.parentNode.insertBefore(fb, input.nextSibling);
    }
    fb.textContent = message || 'This field is required.';
  }

  function clearValidation(form){
    if (!form) return;
    form.querySelectorAll('.is-invalid').forEach(el=> el.classList.remove('is-invalid'));
    form.querySelectorAll('.invalid-feedback').forEach(el=> el.parentNode && el.parentNode.removeChild(el));
  }

  function validateProductForm(form){
    if (!form) return false;
    clearValidation(form);
    let ok = true;
    const name = form.querySelector('[name="name"]');
    const price = form.querySelector('[name="price"]');
    const stock = form.querySelector('[name="stock_quantity"]');
    const description = form.querySelector('[name="description"]');
    const variant = form.querySelector('[name="variant_name"]');
    const image = form.querySelector('[name="image"]');
    const idField = form.querySelector('[name="id"]');
    const isCreate = !(idField && idField.value);

    if (!name || !name.value.trim()) { setInvalid(name, 'Name is required'); ok = false; }

    if (!price || price.value === '' || isNaN(Number(price.value))) { setInvalid(price, 'Price is required'); ok = false; }
    else if (Number(price.value) < 0) { setInvalid(price, 'Price cannot be negative'); ok = false; }

    if (!variant || !variant.value.trim()) { setInvalid(variant, 'Please choose a category'); ok = false; }

    // quantity is required and must be integer >= 0
    if (!stock || stock.value === ''){ setInvalid(stock, 'Quantity is required'); ok = false; }
    else {
      const sq = Number(stock.value);
      if (!Number.isInteger(sq) || sq < 0){ setInvalid(stock, 'Stock must be 0 or a positive integer'); ok = false; }
    }

    // description required
    if (!description || !description.value.trim()){ setInvalid(description, 'Description is required'); ok = false; }

    // image validation: required on create, optional on update
    if (image){
      const files = image.files || [];
      if (isCreate){
        if (!files.length){ setInvalid(image, 'Please upload an image'); ok = false; }
      }
      if (files.length){
        const f = files[0];
        if (!f.type || !f.type.startsWith('image/')){ setInvalid(image, 'File must be an image'); ok = false; }
        const max = 5 * 1024 * 1024; // 5MB
        if (f.size > max){ setInvalid(image, 'Image must be 5MB or smaller'); ok = false; }
      }
    }

    return ok;
  }

  // Open delete confirmation modal
  function openDeleteModal(product){
    const modalEl = document.getElementById('productDeleteModal');
    if (!modalEl) {
      if (!confirm('Delete this product? This will remove the product and its image file.')) return;
      performDelete(product.id);
      return;
    }
    const msg = document.getElementById('productDeleteMessage');
    const idInput = document.getElementById('productDeleteId');
    msg.textContent = `Delete product "${product.name || ''}"? This will remove the product and its image file.`;
    idInput.value = product.id;
    const bs = bootstrap.Modal.getOrCreateInstance(modalEl);
    
    bs.show();
    const confirmBtn = document.getElementById('productDeleteConfirm');
    const handler = async () => {
      confirmBtn.disabled = true;
      try{
        await performDelete(product.id);
        bs.hide();
      }finally{
        confirmBtn.disabled = false;
        confirmBtn.removeEventListener('click', handler);
      }
    };
    confirmBtn.addEventListener('click', handler);
  }

  // Accessibility: manage focus around the Bootstrap delete modal to avoid
  // the browser warning about aria-hidden being applied while a descendant
  // still retains focus. On hide, blur any focused element inside the modal;
  // on hidden, restore focus to the original trigger if available.
  (function manageDeleteModalFocus(){
    const modalEl = document.getElementById('productDeleteModal');
    if (!modalEl || !window.bootstrap) return;

    // after modal is fully hidden, restore focus to the trigger if present
    modalEl.addEventListener('hidden.bs.modal', ()=>{
      try {
        if (lastDeleteModalTrigger && typeof lastDeleteModalTrigger.focus === 'function') {
          lastDeleteModalTrigger.focus();
        } else {
          // fallback: focus search input for convenience
          const search = document.getElementById('productSearch');
          if (search && typeof search.focus === 'function') search.focus();
        }
      } catch (err) { /* ignore */ }
      lastDeleteModalTrigger = null;
      
      // Extra cleanup for mobile - ensure body is scrollable
      setTimeout(() => {
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        const backdrops = document.querySelectorAll('.modal-backdrop');
        backdrops.forEach(bd => {
          if (bd.parentNode) bd.parentNode.removeChild(bd);
        });
      }, 50);
    });
  })();

  // Inline editor state
  let currentInlineEditorId = null;
  let currentInlineEditorRow = null;

  // Open inline editor row under the product's table row
  async function openInlineEditor(product){
    // close any existing editor
    await closeInlineEditor();
    if (!product) return;
    currentInlineEditorId = product.id;
    
    // Use requestAnimationFrame for smooth rendering
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        // find the product's table row
        const tbody = document.querySelector('.data-table tbody');
        if (!tbody) {
          resolve();
          return;
        }
        const rows = Array.from(tbody.querySelectorAll('tr'));
        let targetRow = null;
        for (const r of rows){
          const firstTd = r.querySelector('td');
          if (!firstTd) continue;
          if (String(firstTd.textContent).trim() === String(product.id)) { targetRow = r; break; }
        }
        // build editor row
        const cols = document.querySelectorAll('.data-table thead th').length;
        const tr = document.createElement('tr');
        tr.className = 'inline-editor-row';
        const td = document.createElement('td');
        td.colSpan = cols;
        td.innerHTML = `
          <div class="inline-editor" style="display:flex;gap:12px;flex-direction:column">
            <form class="inline-edit-form" enctype="multipart/form-data">
              <div style="display:flex;gap:12px;flex-wrap:wrap">
                <input type="hidden" name="id" value="${escapeHtml(product.id)}" />
                <div style="flex:1;min-width:180px">
                  <label class="form-label">Name</label>
                  <input name="name" class="form-control" value="${escapeHtml(product.name||'')}" />
                </div>
                <div style="width:140px">
                  <label class="form-label">Price</label>
                  <input name="price" type="number" step="0.01" class="form-control" value="${product.price!=null?product.price:''}" />
                </div>
                <div style="width:140px">
                  <label class="form-label">Category</label>
                  <select name="variant_name" class="form-select">
                    <option value="">Select</option>
                    <option value="hot">hot</option>
                    <option value="cold">cold</option>
                    <option value="special">special</option>
                  </select>
                </div>
                <div style="width:120px">
                  <label class="form-label">Stock</label>
                  <input name="stock_quantity" type="number" min="0" class="form-control" value="${product.stock_quantity!=null?product.stock_quantity:''}" />
                </div>
                <div style="flex:1;min-width:220px">
                  <label class="form-label">Image</label>
                  <input name="image" type="file" accept="image/*" class="form-control" />
                </div>
              </div>
              <div style="margin-top:8px;display:flex;gap:12px;align-items:center">
                <div style="flex:1">
                  <label class="form-label">Description</label>
                  <input name="description" class="form-control" value="${escapeHtml(product.description||'')}" />
                </div>
                <div style="display:flex;gap:8px;align-items:center">
                  <button type="button" class="btn btn-secondary inline-cancel">Cancel</button>
                  <button type="button" class="btn btn-primary inline-save">Save</button>
                </div>
              </div>
            </form>
          </div>
        `;
        tr.appendChild(td);

        if (targetRow && targetRow.parentNode) targetRow.parentNode.insertBefore(tr, targetRow.nextSibling);
        else tbody.appendChild(tr);
        currentInlineEditorRow = tr;

        // set select value
        const sel = tr.querySelector('select[name="variant_name"]');
        if (sel) sel.value = product.variant_name || '';

        // wire buttons
        const saveBtn = tr.querySelector('.inline-save');
        const cancelBtn = tr.querySelector('.inline-cancel');
        const form = tr.querySelector('.inline-edit-form');

        cancelBtn.addEventListener('click', async ()=> await closeInlineEditor());

        saveBtn.addEventListener('click', async ()=>{
          // reuse existing submitUpdate to perform PUT
          // disable while in-flight
          saveBtn.disabled = true;
          try{
            await submitUpdate(product.id, form, { close: async () => await closeInlineEditor() });
          }finally{
            saveBtn.disabled = false;
          }
        });
        
        resolve();
      });
    });
  }

  async function closeInlineEditor(){
    // Use requestAnimationFrame for smooth removal
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        if (currentInlineEditorRow && currentInlineEditorRow.parentNode) currentInlineEditorRow.parentNode.removeChild(currentInlineEditorRow);
        currentInlineEditorRow = null;
        currentInlineEditorId = null;
        resolve();
      });
    });
  }

  async function performDelete(id){
    try{
      const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE', credentials: 'same-origin' });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Delete failed');
      await loadProducts();
      showToast('Product deleted', 'success');
    }catch(err){
      console.error(err);
      showToast('Failed to delete product', 'danger');
    }
  }

  // Populate category select options from products list
  function populateCategorySelect(products){
    // Fixed category list: only show hot, cold, special
    const select = document.getElementById('productFormVariant');
    if (!select) return;
    select.innerHTML = `
      <option value="">Select category</option>
      <option value="hot">hot</option>
      <option value="cold">cold</option>
      <option value="special">special</option>
    `;
  }

  // Render pagination controls into #productsPagination
  async function renderPagination(){
    const container = document.getElementById('productsPagination');
    if (!container) return;
    
    // Use requestAnimationFrame for smooth UI updates
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        container.innerHTML = '';
        const total = filteredProducts.length;
        const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

        const info = document.createElement('div');
        info.className = 'pagination-info';
        const start = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
        const end = Math.min(total, currentPage * PAGE_SIZE);
        info.textContent = `Showing ${start}-${end} of ${total} products`;
        container.appendChild(info);

        const nav = document.createElement('div');
        nav.className = 'pagination-buttons';

        const prev = document.createElement('button');
        prev.className = 'pagination-btn';
      prev.type = 'button';
        prev.textContent = '<';
        prev.disabled = currentPage <= 1;
        prev.addEventListener('click', async ()=>{ if (currentPage>1){ currentPage--; await applyFiltersAndRender(); } });
        nav.appendChild(prev);

        // show up to 7 page buttons (with collapsing behavior)
        const maxButtons = 7;
        let startPage = Math.max(1, currentPage - Math.floor(maxButtons/2));
        let endPage = Math.min(totalPages, startPage + maxButtons - 1);
        if (endPage - startPage + 1 < maxButtons){ startPage = Math.max(1, endPage - maxButtons + 1); }

        for(let p = startPage; p <= endPage; p++){
          const b = document.createElement('button');
          b.className = 'pagination-btn' + (p===currentPage ? ' active' : '');
          b.type = 'button';
          b.textContent = String(p);
          b.disabled = p===currentPage;
          b.addEventListener('click', async ()=>{ currentPage = p; await applyFiltersAndRender(); });
          nav.appendChild(b);
        }

        const next = document.createElement('button');
        next.className = 'pagination-btn';
      next.type = 'button';
        next.textContent = '>';
        next.disabled = currentPage >= totalPages;
        next.addEventListener('click', async ()=>{ if (currentPage < totalPages){ currentPage++; await applyFiltersAndRender(); } });
        nav.appendChild(next);

        container.appendChild(nav);
        resolve();
      });
    });
  }

  // Simple debounce
  function debounce(fn, wait){
    let t;
    return function(...args){
      clearTimeout(t);
      t = setTimeout(()=> fn.apply(this, args), wait);
    };
  }

  // When form is submitted, prepare the hidden variant_name field from select/custom input
  function prepareVariantField(form){
    try{
      // nothing to prepare anymore: select has name="variant_name" and will submit directly
      return;
    }catch(e){/* ignore */}
  }

  function setVariantSelection(value){
    const select = document.getElementById('productFormVariant');
    if (!select) return;
    // if option exists, select it
    const opt = Array.from(select.options).find(o=>o.value===value);
    if (opt) select.value = value; else select.value = '';
  }

  // Toast helper
  function showToast(message, type='success'){
    try{
      const container = document.getElementById('toastContainer');
      if (!container) { alert(message); return; }
      const toastId = 't' + Date.now();
      const toastHtml = `
        <div id="${toastId}" class="toast align-items-center text-bg-${type} border-0 mb-2" role="alert" aria-live="assertive" aria-atomic="true">
          <div class="d-flex">
            <div class="toast-body">${escapeHtml(message)}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
          </div>
        </div>`;
      const node = el(toastHtml);
      container.appendChild(node);
      const t = new bootstrap.Toast(node, { delay: 4000 });
      t.show();
      // remove after hidden
      node.addEventListener('hidden.bs.toast', ()=>{ if (node && node.parentNode) node.parentNode.removeChild(node); });
    }catch(e){ console.error(e); }
  }

  // hook up Add New Product button and initial load
  document.addEventListener('DOMContentLoaded', ()=>{
    const addBtn = document.querySelector('.filters-bar .btn-primary');
    if (addBtn) addBtn.addEventListener('click', openAddModal);
    // wire search input (debounced)
    const search = document.getElementById('productSearch');
    if (search){
      const onSearch = debounce(async (e)=>{
        searchTerm = e.target.value || '';
        currentPage = 1;
        await applyFiltersAndRender();
      }, 300);
      search.addEventListener('input', onSearch);
    }

    // Set up event delegation for edit/delete buttons - ONCE for entire table
    const tbody = document.querySelector('.data-table tbody');
    if (tbody) {
      tbody.addEventListener('click', async (e) => {
        // Prevent multiple rapid clicks
        if (e.target.closest('.btn-icon')?.disabled) return;
        
        // Find the button that was clicked
        const editBtn = e.target.closest('.btn-edit');
        const deleteBtn = e.target.closest('.btn-delete');
        
        if (editBtn) {
          // Disable button temporarily to prevent double-clicks
          editBtn.disabled = true;
          try {
            const id = editBtn.dataset.id;
            const product = allProducts.find(x => String(x.id) === String(id));
            if (product) await openInlineEditor(product);
          } finally {
            // Re-enable after a short delay
            setTimeout(() => { editBtn.disabled = false; }, 300);
          }
        } else if (deleteBtn) {
          // Disable button temporarily to prevent double-clicks
          deleteBtn.disabled = true;
          try {
            const id = deleteBtn.dataset.id;
            const product = allProducts.find(x => String(x.id) === String(id));
            if (product) {
              try { lastDeleteModalTrigger = deleteBtn; } catch (err) { lastDeleteModalTrigger = null; }
              await new Promise(resolve => {
                requestAnimationFrame(() => {
                  openDeleteModal(product);
                  resolve();
                });
              });
            }
          } finally {
            // Re-enable after a short delay
            setTimeout(() => { deleteBtn.disabled = false; }, 300);
          }
        }
      });
    }

    // nothing extra to wire for category select (fixed options)
    loadProducts();
  });

  // Ensure table-scroll responds to wheel/trackpad so both axes can be scrolled
  // Removed custom JS table-scroll wheel/touch handling. Bootstrap's
  // responsive table classes will be used instead. This keeps behavior
  // simpler and avoids conflicts with native scrolling on modern browsers.

})();
// Admin Products JavaScript
// (sidebar toggle moved to /js/admin/adminHeader.js)