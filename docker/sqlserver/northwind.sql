-- ═══════════════════════════════════════════════════════════
-- Northwind — SQL Server (T-SQL)
-- ═══════════════════════════════════════════════════════════

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'NorthwindSS')
    CREATE DATABASE NorthwindSS;
GO

USE NorthwindSS;
GO

-- ── Schema ───────────────────────────────────────────────────

CREATE TABLE categories (
    category_id   INT IDENTITY(1,1) PRIMARY KEY,
    category_name NVARCHAR(50)  NOT NULL,
    description   NVARCHAR(MAX)
);

CREATE TABLE suppliers (
    supplier_id  INT IDENTITY(1,1) PRIMARY KEY,
    company_name NVARCHAR(100) NOT NULL,
    country      NVARCHAR(50)
);

CREATE TABLE products (
    product_id     INT IDENTITY(1,1) PRIMARY KEY,
    product_name   NVARCHAR(100) NOT NULL,
    supplier_id    INT REFERENCES suppliers(supplier_id),
    category_id    INT REFERENCES categories(category_id),
    unit_price     DECIMAL(10,2) DEFAULT 0,
    units_in_stock INT DEFAULT 0,
    discontinued   BIT DEFAULT 0
);

CREATE TABLE customers (
    customer_id  CHAR(5) PRIMARY KEY,
    company_name NVARCHAR(100) NOT NULL,
    contact_name NVARCHAR(60),
    city         NVARCHAR(50),
    country      NVARCHAR(50)
);

CREATE TABLE employees (
    employee_id INT IDENTITY(1,1) PRIMARY KEY,
    first_name  NVARCHAR(50) NOT NULL,
    last_name   NVARCHAR(50) NOT NULL,
    title       NVARCHAR(100),
    hire_date   DATE
);

CREATE TABLE shippers (
    shipper_id   INT IDENTITY(1,1) PRIMARY KEY,
    company_name NVARCHAR(50) NOT NULL
);

CREATE TABLE orders (
    order_id      INT IDENTITY(1,1) PRIMARY KEY,
    customer_id   CHAR(5) REFERENCES customers(customer_id),
    employee_id   INT REFERENCES employees(employee_id),
    order_date    DATE NOT NULL,
    required_date DATE,
    shipped_date  DATE,
    shipper_id    INT REFERENCES shippers(shipper_id),
    freight       DECIMAL(10,2) DEFAULT 0
);

CREATE TABLE order_details (
    order_id   INT REFERENCES orders(order_id),
    product_id INT REFERENCES products(product_id),
    unit_price DECIMAL(10,2) NOT NULL,
    quantity   SMALLINT NOT NULL DEFAULT 1,
    discount   REAL DEFAULT 0,
    PRIMARY KEY (order_id, product_id)
);
GO

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

-- ── Products (precios ligeramente diferentes para comparación) ──

SET IDENTITY_INSERT products ON;
INSERT INTO products (product_id, product_name, supplier_id, category_id, unit_price, units_in_stock, discontinued) VALUES
(1,  'Chai',                           1, 1, 20.00,  25, 0),
(2,  'Chang',                          1, 1, 22.00,  12, 0),
(3,  'Aniseed Syrup',                  1, 2, 11.50,   8, 0),
(4,  'Chef Anton''s Cajun Seasoning',  2, 2, 24.00,  47, 0),
(5,  'Grandma''s Boysenberry Spread',  3, 2, 28.00, 100, 0),
(6,  'Uncle Bob''s Organic Dried Pears',3,7, 33.00,  10, 0),
(7,  'Northwoods Cranberry Sauce',     3, 2, 44.00,   4, 0),
(8,  'Mishi Kobe Niku',                4, 6,105.00,  18, 0),
(9,  'Ikura',                          4, 8, 35.00,  25, 0),
(10, 'Queso Cabrales',                 5, 4, 23.00,  18, 0),
(11, 'Queso Manchego La Pastora',      5, 4, 42.00,  70, 0),
(12, 'Konbu',                          4, 8,  7.50,  20, 0),
(13, 'Tofu',                           4, 7, 26.00,  28, 0),
(14, 'Genen Shouyu',                   6, 2, 17.00,  35, 0),
(15, 'Pavlova',                        7, 3, 19.50, 100, 0),
(16, 'Alice Mutton',                   7, 6, 42.00,   0, 1),
(17, 'Carnarvon Tigers',               7, 8, 68.00,  35, 0),
(18, 'Teatime Chocolate Biscuits',     7, 3, 10.50,  20, 0),
(19, 'Sir Rodney''s Marmalade',        7, 3, 88.00,  35, 0),
(20, 'Sir Rodney''s Scones',           7, 3, 12.00,   2, 0);
SET IDENTITY_INSERT products OFF;
GO

-- ── Customers (mercado diferente — más América Latina) ───────

INSERT INTO customers (customer_id, company_name, contact_name, city, country) VALUES
('CACTU', 'Cactus Comidas para llevar',  'Patricio Simpson', 'Buenos Aires', 'Argentina'),
('CENTC', 'Centro comercial Moctezuma',  'Francisco Chang',  'México D.F.',  'Mexico'),
('COMMI', 'Comércio Mineiro',            'Pedro Afonso',     'Sao Paulo',    'Brazil'),
('FAMIA', 'Familia Arquibaldo',          'Aria Cruz',        'Sao Paulo',    'Brazil'),
('GOURL', 'Gourmet Lanchonetes',         'André Fonseca',    'Campinas',     'Brazil'),
('HANAR', 'Hanari Carnes',              'Mario Pontes',     'Rio de Janeiro','Brazil'),
('HILAA', 'HILARION-Abastos',           'Carlos Hernandez', 'San Cristóbal','Venezuela'),
('LARCM', 'La corne d''abondance',      'Daniel Tonini',    'Versailles',   'France'),
('LILAS', 'LILA-Supermercado',          'Carlos González',  'Barquisimeto', 'Venezuela'),
('LINOD', 'LINO-Delicateses',           'Felipe Izquierdo', 'I. de Margarita','Venezuela');

-- ── Employees ────────────────────────────────────────────────

INSERT INTO employees (first_name, last_name, title, hire_date) VALUES
('Nancy',    'Davolio',   'Sales Representative', '1992-05-01'),
('Andrew',   'Fuller',    'Vice President Sales',  '1992-08-14'),
('Janet',    'Leverling', 'Sales Representative', '1992-04-01'),
('Margaret', 'Peacock',   'Sales Representative', '1993-05-03'),
('Steven',   'Buchanan',  'Sales Manager',        '1993-10-17');

-- ── Shippers ─────────────────────────────────────────────────

INSERT INTO shippers (company_name) VALUES
('Speedy Express'),
('United Package'),
('Federal Shipping');
GO

-- ── Orders ───────────────────────────────────────────────────

INSERT INTO orders (customer_id, employee_id, order_date, required_date, shipped_date, shipper_id, freight) VALUES
('CACTU', 2, '2024-07-10', '2024-08-07', '2024-07-18', 1, 45.20),
('CENTC', 1, '2024-07-15', '2024-08-12', '2024-07-25', 2, 22.50),
('COMMI', 3, '2024-07-22', '2024-08-19', '2024-07-30', 1, 78.90),
('FAMIA', 4, '2024-08-05', '2024-09-02', '2024-08-15', 3, 33.10),
('GOURL', 5, '2024-08-15', '2024-09-12', '2024-08-25', 2, 56.40),
('HANAR', 1, '2024-09-01', '2024-09-29', '2024-09-10', 1, 91.75),
('HILAA', 2, '2024-09-12', '2024-10-10', '2024-09-22', 2, 18.30),
('LARCM', 3, '2024-09-25', '2024-10-23', '2024-10-05', 3, 67.80),
('LILAS', 4, '2024-10-08', '2024-11-05', '2024-10-18', 1, 42.60),
('LINOD', 5, '2024-10-20', '2024-11-17', '2024-10-30', 2, 29.15),
('CACTU', 1, '2024-11-05', '2024-12-03', '2024-11-15', 1, 38.90),
('CENTC', 3, '2024-11-18', '2024-12-16', '2024-11-28', 3, 15.20),
('COMMI', 2, '2024-12-02', '2024-12-30', '2024-12-12', 2, 84.35),
('FAMIA', 5, '2024-12-15', '2025-01-12', '2024-12-25', 1, 51.70),
('GOURL', 1, '2025-01-08', '2025-02-05', '2025-01-18', 2, 23.45),
('HANAR', 4, '2025-01-22', '2025-02-19', '2025-02-01', 3, 110.25),
('HILAA', 2, '2025-02-05', '2025-03-05', '2025-02-15', 1, 37.80),
('LARCM', 3, '2025-02-18', '2025-03-18', '2025-02-28', 2, 62.40),
('LILAS', 5, '2025-03-04', '2025-04-01', '2025-03-14', 1, 28.90),
('LINOD', 1, '2025-03-18', '2025-04-15', '2025-03-28', 3, 74.15),
('CACTU', 3, '2025-04-02', '2025-04-30', '2025-04-10', 2, 19.60),
('CENTC', 2, '2025-04-15', '2025-05-13', '2025-04-23', 1, 88.30),
('COMMI', 4, '2025-04-28', '2025-05-26', '2025-05-08', 2, 44.90),
-- Pendientes
('FAMIA', 1, '2025-05-05', '2025-06-02', NULL, 3, 55.60),
('GOURL', 5, '2025-05-08', '2025-06-05', NULL, 1, 31.20),
('HANAR', 2, '2025-05-10', '2025-06-07', NULL, 2, 97.45),
('HILAA', 3, '2025-05-12', '2025-06-09', NULL, 1, 14.75),
('LARCM', 4, '2025-05-14', '2025-06-11', NULL, 3, 66.30),
('LILAS', 1, '2025-05-16', '2025-06-13', NULL, 2, 39.80),
('LINOD', 5, '2025-05-18', '2025-06-15', NULL, 1, 22.10);
GO

-- ── Order Details (distribución diferente a PostgreSQL) ──────

INSERT INTO order_details (order_id, product_id, unit_price, quantity, discount) VALUES
(1,  2, 22.00, 15, 0.00),
(1,  9, 35.00,  8, 0.00),
(2,  1, 20.00, 25, 0.05),
(2, 15, 19.50, 10, 0.00),
(3,  8,105.00,  4, 0.00),
(3, 11, 42.00,  6, 0.10),
(4,  2, 22.00, 18, 0.00),
(4,  5, 28.00, 12, 0.00),
(4, 17, 68.00,  3, 0.00),
(5,  9, 35.00, 25, 0.00),
(5, 13, 26.00, 10, 0.05),
(6,  1, 20.00, 20, 0.00),
(6,  3, 11.50, 15, 0.00),
(7,  8,105.00,  5, 0.05),
(7, 15, 19.50, 20, 0.00),
(8,  2, 22.00, 22, 0.00),
(8,  9, 35.00, 18, 0.10),
(9,  1, 20.00, 12, 0.00),
(9, 11, 42.00,  8, 0.00),
(9, 18, 10.50, 20, 0.00),
(10, 2, 22.00, 16, 0.00),
(10,13, 26.00, 14, 0.05),
(11, 1, 20.00, 30, 0.10),
(11, 9, 35.00, 12, 0.00),
(12, 8,105.00,  3, 0.00),
(12,15, 19.50, 25, 0.00),
(13, 2, 22.00, 20, 0.00),
(13, 5, 28.00, 10, 0.00),
(14, 1, 20.00, 15, 0.05),
(14, 9, 35.00, 20, 0.00),
(14,17, 68.00,  4, 0.00),
(15, 2, 22.00, 18, 0.00),
(15,11, 42.00,  7, 0.10),
(16, 1, 20.00, 22, 0.00),
(16, 8,105.00,  2, 0.00),
(17, 9, 35.00, 28, 0.05),
(17,15, 19.50, 15, 0.00),
(18, 2, 22.00, 12, 0.00),
(18, 5, 28.00,  8, 0.00),
(19, 1, 20.00, 20, 0.00),
(19,13, 26.00, 12, 0.00),
(20, 8,105.00,  6, 0.00),
(20, 9, 35.00, 22, 0.10),
(21, 2, 22.00, 25, 0.00),
(21,15, 19.50, 18, 0.00),
(22, 1, 20.00, 14, 0.05),
(22,11, 42.00, 10, 0.00),
(23, 9, 35.00, 30, 0.00),
(23,17, 68.00,  5, 0.00),
-- Pendientes
(24, 2, 22.00, 12, 0.00),
(24,13, 26.00,  8, 0.00),
(25, 1, 20.00, 20, 0.05),
(25, 9, 35.00, 15, 0.00),
(26, 8,105.00,  3, 0.00),
(26,15, 19.50, 22, 0.00),
(27, 2, 22.00, 18, 0.00),
(27, 5, 28.00, 10, 0.00),
(28, 1, 20.00, 25, 0.00),
(28,17, 68.00,  4, 0.00),
(29, 9, 35.00, 20, 0.10),
(29,11, 42.00,  6, 0.00),
(30, 2, 22.00, 16, 0.00),
(30,13, 26.00, 12, 0.05),
(30,15, 19.50, 10, 0.00);
GO
