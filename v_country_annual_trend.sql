
CREATE VIEW data.v_country_annual_trend AS
SELECT 
    country,
    toYear(timestamp) AS year,
    avg(value) AS mean_cf
FROM data.pvgis
GROUP BY 
    country, 
    year;