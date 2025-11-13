-- 1. Per-user notifications (customer side)
CREATE TABLE IF NOT EXISTS notifications (
  id            BIGSERIAL PRIMARY KEY,
  user_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type          VARCHAR(40) NOT NULL,          -- e.g. 'order_status'
  title         TEXT NOT NULL,
  message       TEXT NOT NULL,
  order_id      BIGINT REFERENCES orders(id) ON DELETE CASCADE,
  is_read       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications (user_id, is_read);

-- 2. Admin notifications (global to admins)
CREATE TABLE IF NOT EXISTS admin_notifications (
  id            BIGSERIAL PRIMARY KEY,
  type          VARCHAR(40) NOT NULL,          -- e.g. 'new_order'
  title         TEXT NOT NULL,
  message       TEXT NOT NULL,
  order_id      BIGINT REFERENCES orders(id) ON DELETE CASCADE,
  is_read       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_unread
  ON admin_notifications (is_read);

-- ─────────────────────────────────────────────────────────────────────────────
-- TRIGGER: New order → notify admins
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_notify_admin_new_order()
RETURNS TRIGGER AS $$
DECLARE
  u_first_name TEXT;
  u_last_name TEXT;
  u_full_name TEXT;
BEGIN
  SELECT first_name, last_name INTO u_first_name, u_last_name FROM users WHERE id = NEW.user_id;
  
  u_full_name := COALESCE(TRIM(CONCAT(u_first_name, ' ', u_last_name)), 'Unknown User');

  INSERT INTO admin_notifications (type, title, message, order_id)
  VALUES (
    'new_order',
    CONCAT('New order #', NEW.id),
    CONCAT('New order #', NEW.id, ' placed by ', u_full_name,
           ' | Amount: ', NEW.total_amount),
    NEW.id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS t_notify_admin_new_order ON orders;
CREATE TRIGGER t_notify_admin_new_order
AFTER INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION trg_notify_admin_new_order();

-- ─────────────────────────────────────────────────────────────────────────────
-- TRIGGER: Order status change → notify the order's user
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_notify_user_order_status()
RETURNS TRIGGER AS $$
DECLARE
  old_status TEXT := COALESCE(OLD.order_status, '');
  new_status TEXT := COALESCE(NEW.order_status, '');
BEGIN
  IF old_status IS DISTINCT FROM new_status THEN
    INSERT INTO notifications (user_id, type, title, message, order_id)
    VALUES (
      NEW.user_id,
      'order_status',
      CONCAT('Your order #', NEW.id, ' is now ', new_status),
      CONCAT('Order #', NEW.id, ' status changed from "', old_status,
             '" to "', new_status, '".'),
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS t_notify_user_order_status ON orders;
CREATE TRIGGER t_notify_user_order_status
AFTER UPDATE OF order_status ON orders
FOR EACH ROW
EXECUTE FUNCTION trg_notify_user_order_status();