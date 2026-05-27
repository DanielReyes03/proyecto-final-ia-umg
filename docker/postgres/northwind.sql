-- ═══════════════════════════════════════════════════════════
-- Northwind — PostgreSQL
-- ═══════════════════════════════════════════════════════════

-- ── Schema ──────────────────────────────────────────────────

CREATE TABLE categories (
    category_id   SERIAL PRIMARY KEY,
    category_name VARCHAR(50)  NOT NULL,
    description   TEXT
);

CREATE TABLE suppliers (
    supplier_id  SERIAL PRIMARY KEY,
    company_name VARCHAR(100) NOT NULL,
    country      VARCHAR(50)
);

CREATE TABLE products (
    product_id     SERIAL PRIMARY KEY,
    product_name   VARCHAR(100) NOT NULL,
    supplier_id    INT REFERENCES suppliers(supplier_id),
    category_id    INT REFERENCES categories(category_id),
    unit_price     NUMERIC(10,2) DEFAULT 0,
    units_in_stock INT DEFAULT 0,
    discontinued   BOOLEAN DEFAULT FALSE
);

CREATE TABLE customers (
    customer_id  CHAR(5) PRIMARY KEY,
    company_name VARCHAR(100) NOT NULL,
    contact_name VARCHAR(60),
    city         VARCHAR(50),
    country      VARCHAR(50)
);

CREATE TABLE employees (
    employee_id SERIAL PRIMARY KEY,
    first_name  VARCHAR(50) NOT NULL,
    last_name   VARCHAR(50) NOT NULL,
    title       VARCHAR(100),
    hire_date   DATE
);

CREATE TABLE shippers (
    shipper_id   SERIAL PRIMARY KEY,
    company_name VARCHAR(50) NOT NULL
);

CREATE TABLE orders (
    order_id      SERIAL PRIMARY KEY,
    customer_id   CHAR(5) REFERENCES customers(customer_id),
    employee_id   INT REFERENCES employees(employee_id),
    order_date    DATE NOT NULL,
    required_date DATE,
    shipped_date  DATE,
    shipper_id    INT REFERENCES shippers(shipper_id),
    freight       NUMERIC(10,2) DEFAULT 0
);

CREATE TABLE order_details (
    order_id   INT REFERENCES orders(order_id),
    product_id INT REFERENCES products(product_id),
    unit_price NUMERIC(10,2) NOT NULL,
    quantity   SMALLINT NOT NULL DEFAULT 1,
    discount   REAL DEFAULT 0,
    PRIMARY KEY (order_id, product_id)
);

-- ── Categories ───────────────────────────────────────────────

INSERT INTO categories (category_name, description) VALUES
('Beverages',     'Soft drinks, coffees, teas, beers, and ales'),
('Condiments',    'Sweet and savory sauces, relishes, spreads, and seasonings'),
('Confections',   'Desserts, candies, and sweet breads'),
('Dairy Products','Cheeses and dairy products'),
('Grains/Cereals','Breads, crackers, pasta, and cereal'),
('Meat/Poultry',  'Prepared meats'),
('Produce',       'Dried fruit and bean curd'),
('Seafood',       'Seaweed and fish');

-- ── Suppliers ────────────────────────────────────────────────

INSERT INTO suppliers (company_name, country) VALUES
('Exotic Liquids',                    'UK'),
('New Orleans Cajun Delights',        'USA'),
('Grandma Kelly''s Homestead',        'USA'),
('Tokyo Traders',                     'Japan'),
('Cooperativa de Quesos Las Cabras',  'Spain'),
('Mayumi''s',                         'Japan'),
('Pavlova Ltd.',                      'Australia');

-- ── Products ─────────────────────────────────────────────────

INSERT INTO products (product_name, supplier_id, category_id, unit_price, units_in_stock, discontinued) VALUES
('Chai',                          1, 1, 18.00,  39, FALSE),
('Chang',                         1, 1, 19.00,  17, FALSE),
('Aniseed Syrup',                 1, 2, 10.00,  13, FALSE),
('Chef Anton''s Cajun Seasoning', 2, 2, 22.00,  53, FALSE),
('Grandma''s Boysenberry Spread', 3, 2, 25.00, 120, FALSE),
('Uncle Bob''s Organic Dried Pears',3,7, 30.00,  15, FALSE),
('Northwoods Cranberry Sauce',    3, 2, 40.00,   6, FALSE),
('Mishi Kobe Niku',               4, 6, 97.00,  29, FALSE),
('Ikura',                         4, 8, 31.00,  31, FALSE),
('Queso Cabrales',                5, 4, 21.00,  22, FALSE),
('Queso Manchego La Pastora',     5, 4, 38.00,  86, FALSE),
('Konbu',                         4, 8,  6.00,  24, FALSE),
('Tofu',                          4, 7, 23.25,  35, FALSE),
('Genen Shouyu',                  6, 2, 15.50,  39, FALSE),
('Pavlova',                       7, 3, 17.45, 115, FALSE),
('Alice Mutton',                  7, 6, 39.00,   0, TRUE),
('Carnarvon Tigers',              7, 8, 62.50,  42, FALSE),
('Teatime Chocolate Biscuits',    7, 3,  9.20,  25, FALSE),
('Sir Rodney''s Marmalade',       7, 3, 81.00,  40, FALSE),
('Sir Rodney''s Scones',          7, 3, 10.00,   3, FALSE);

-- ── Customers ────────────────────────────────────────────────

INSERT INTO customers (customer_id, company_name, contact_name, city, country) VALUES
('ALFKI', 'Alfreds Futterkiste',            'Maria Anders',      'Berlin',      'Germany'),
('ANATR', 'Ana Trujillo Emparedados',       'Ana Trujillo',      'México D.F.', 'Mexico'),
('BOLID', 'Bólido Comidas preparadas',      'Martín Sommer',     'Madrid',      'Spain'),
('BONAP', 'Bon app''',                      'Laurence Lebihan',  'Marseille',   'France'),
('CHOPS', 'Chop-suey Chinese',              'Yang Wang',         'Bern',        'Switzerland'),
('COMMI', 'Comércio Mineiro',               'Pedro Afonso',      'Sao Paulo',   'Brazil'),
('CONSH', 'Consolidated Holdings',          'Elizabeth Brown',   'London',      'UK'),
('DRACD', 'Drachenblut Delikatessen',       'Sven Ottlieb',      'Aachen',      'Germany'),
('ERNSH', 'Ernst Handel',                   'Roland Mendel',     'Graz',        'Austria'),
('FAMIA', 'Familia Arquibaldo',             'Aria Cruz',         'Sao Paulo',   'Brazil');

-- ── Employees ────────────────────────────────────────────────

INSERT INTO employees (first_name, last_name, title, hire_date) VALUES
('Nancy',    'Davolio',   'Sales Representative', '1992-05-01'),
('Andrew',   'Fuller',    'Vice President Sales', '1992-08-14'),
('Janet',    'Leverling', 'Sales Representative', '1992-04-01'),
('Margaret', 'Peacock',   'Sales Representative', '1993-05-03'),
('Steven',   'Buchanan',  'Sales Manager',        '1993-10-17');

-- ── Shippers ─────────────────────────────────────────────────

INSERT INTO shippers (company_name) VALUES
('Speedy Express'),
('United Package'),
('Federal Shipping');

-- ── Orders ───────────────────────────────────────────────────

INSERT INTO orders (customer_id, employee_id, order_date, required_date, shipped_date, shipper_id, freight) VALUES
('ALFKI', 1, '2024-07-04', '2024-08-01', '2024-07-16', 1, 32.38),
('ANATR', 4, '2024-07-05', '2024-08-16', '2024-07-10', 2, 11.61),
('BOLID', 3, '2024-07-08', '2024-08-05', '2024-07-12', 1, 65.83),
('BONAP', 1, '2024-07-15', '2024-08-12', '2024-07-20', 2, 41.34),
('CHOPS', 2, '2024-07-16', '2024-08-13', '2024-07-22', 1, 51.30),
('COMMI', 5, '2024-08-01', '2024-08-29', '2024-08-10', 2, 58.17),
('CONSH', 3, '2024-08-10', '2024-09-07', '2024-08-19', 3, 22.98),
('DRACD', 4, '2024-08-22', '2024-09-19', '2024-09-05', 2, 148.33),
('ERNSH', 2, '2024-09-05', '2024-10-03', '2024-09-15', 1, 76.84),
('FAMIA', 1, '2024-09-12', '2024-10-10', '2024-09-20', 3, 34.56),
('ALFKI', 3, '2024-10-01', '2024-10-29', '2024-10-08', 1, 6.01),
('ANATR', 2, '2024-10-15', '2024-11-12', '2024-10-25', 2, 21.12),
('BOLID', 5, '2024-11-01', '2024-11-29', '2024-11-10', 1, 31.23),
('BONAP', 1, '2024-11-15', '2024-12-13', '2024-11-25', 2, 72.45),
('CHOPS', 3, '2024-12-01', '2024-12-29', '2024-12-10', 1, 15.67),
('COMMI', 4, '2024-12-15', '2025-01-12', '2024-12-28', 2, 44.22),
('CONSH', 2, '2025-01-10', '2025-02-07', '2025-01-18', 1, 38.90),
('DRACD', 1, '2025-01-25', '2025-02-22', '2025-02-05', 2, 87.65),
('ERNSH', 5, '2025-02-10', '2025-03-10', '2025-02-18', 3, 23.45),
('FAMIA', 3, '2025-02-28', '2025-03-28', '2025-03-08', 2, 19.89),
('ALFKI', 1, '2025-03-10', '2025-04-07', '2025-03-18', 1, 56.78),
('ANATR', 4, '2025-03-20', '2025-04-17', '2025-03-28', 2, 93.12),
('BOLID', 2, '2025-04-05', '2025-05-03', '2025-04-12', 1, 34.56),
-- Pendientes (sin shipped_date)
('BONAP', 1, '2025-04-20', '2025-05-18', NULL, 2, 67.89),
('CHOPS', 3, '2025-05-01', '2025-05-29', NULL, 1, 12.34),
('COMMI', 5, '2025-05-05', '2025-06-02', NULL, 3, 45.67),
('CONSH', 4, '2025-05-08', '2025-06-05', NULL, 2, 28.90),
('DRACD', 2, '2025-05-10', '2025-06-07', NULL, 1, 72.15),
('ERNSH', 1, '2025-05-12', '2025-06-09', NULL, 2, 38.44),
('FAMIA', 3, '2025-05-15', '2025-06-12', NULL, 3, 19.22);

-- ── Order Details ────────────────────────────────────────────

INSERT INTO order_details (order_id, product_id, unit_price, quantity, discount) VALUES
-- Order 1
(1,  1, 18.00, 12, 0.00),
(1,  9, 31.00,  5, 0.00),
-- Order 2
(2,  1, 18.00, 20, 0.00),
(2,  3, 10.00, 10, 0.00),
(2, 15, 17.45,  5, 0.05),
-- Order 3
(3,  8, 97.00,  3, 0.00),
(3, 11, 38.00,  8, 0.00),
-- Order 4
(4,  1, 18.00, 15, 0.00),
(4,  2, 19.00, 10, 0.10),
(4,  5, 25.00,  6, 0.00),
-- Order 5
(5,  9, 31.00, 20, 0.00),
(5, 17, 62.50,  4, 0.00),
-- Order 6
(6,  2, 19.00, 18, 0.05),
(6, 13, 23.25, 12, 0.00),
-- Order 7
(7,  3, 10.00, 25, 0.00),
(7, 14, 15.50, 10, 0.00),
(7, 15, 17.45,  8, 0.00),
-- Order 8
(8,  1, 18.00, 30, 0.15),
(8,  8, 97.00,  5, 0.00),
-- Order 9
(9,  9, 31.00, 14, 0.00),
(9, 10, 21.00,  7, 0.05),
-- Order 10
(10, 2, 19.00, 22, 0.00),
(10,11, 38.00,  6, 0.10),
(10,18,  9.20, 15, 0.00),
-- Order 11
(11, 1, 18.00, 10, 0.00),
(11,15, 17.45, 20, 0.05),
-- Order 12
(12, 9, 31.00, 25, 0.00),
(12,13, 23.25, 15, 0.00),
-- Order 13
(13, 2, 19.00, 12, 0.00),
(13, 5, 25.00, 10, 0.00),
(13,19, 81.00,  2, 0.00),
-- Order 14
(14, 1, 18.00, 20, 0.10),
(14, 8, 97.00,  4, 0.05),
-- Order 15
(15, 3, 10.00, 30, 0.00),
(15,14, 15.50, 12, 0.00),
-- Order 16
(16, 2, 19.00, 15, 0.00),
(16, 9, 31.00, 18, 0.00),
(16,11, 38.00,  5, 0.00),
-- Order 17
(17, 1, 18.00, 25, 0.05),
(17,15, 17.45, 30, 0.00),
-- Order 18
(18, 8, 97.00,  6, 0.00),
(18,17, 62.50,  3, 0.00),
-- Order 19
(19, 1, 18.00, 18, 0.00),
(19, 2, 19.00, 12, 0.10),
(19,13, 23.25,  8, 0.00),
-- Order 20
(20, 9, 31.00, 22, 0.00),
(20,11, 38.00, 10, 0.05),
-- Order 21
(21, 2, 19.00, 20, 0.00),
(21, 5, 25.00, 15, 0.00),
(21,15, 17.45, 10, 0.00),
-- Order 22
(22, 1, 18.00, 30, 0.10),
(22, 8, 97.00,  3, 0.00),
-- Order 23
(23, 3, 10.00, 20, 0.00),
(23, 9, 31.00, 16, 0.00),
-- Pendientes
(24, 1, 18.00, 10, 0.00),
(24,15, 17.45, 12, 0.00),
(25, 2, 19.00, 15, 0.00),
(25,11, 38.00,  8, 0.00),
(26, 8, 97.00,  4, 0.00),
(26, 9, 31.00, 20, 0.00),
(27, 1, 18.00, 25, 0.05),
(27, 3, 10.00, 18, 0.00),
(28, 2, 19.00, 14, 0.00),
(28,13, 23.25, 10, 0.00),
(29, 9, 31.00, 30, 0.00),
(29,17, 62.50,  5, 0.00),
(30, 1, 18.00, 20, 0.00),
(30,15, 17.45, 15, 0.00),
(30, 5, 25.00, 12, 0.00);
