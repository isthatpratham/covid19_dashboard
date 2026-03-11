-- 1. Create the database
CREATE DATABASE IF NOT EXISTS `covid19`;
USE `covid19`;

-- 2. Create the main table with columns
-- 3. Add indexes for faster analytics queries on country and date
CREATE TABLE IF NOT EXISTS `covid_data` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `country` VARCHAR(120) NOT NULL,
    `date` DATE NOT NULL,
    `confirmed_cases` INT DEFAULT 0,
    `deaths` INT DEFAULT 0,
    `recovered` INT DEFAULT 0,
    INDEX `idx_country` (`country`),
    INDEX `idx_date` (`date`)
);

-- 4. Create the additional table for continent analysis
CREATE TABLE IF NOT EXISTS `country_info` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `country` VARCHAR(120) NOT NULL,
    `continent` VARCHAR(50) NOT NULL
);

-- 5. Insert sample continent data for at least 10 major countries
INSERT INTO `country_info` (`country`, `continent`) VALUES
('USA', 'North America'),
('India', 'Asia'),
('Brazil', 'South America'),
('UK', 'Europe'),
('Russia', 'Europe'),
('France', 'Europe'),
('Germany', 'Europe'),
('China', 'Asia'),
('Italy', 'Europe'),
('Spain', 'Europe');
