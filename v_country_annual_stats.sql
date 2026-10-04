
CREATE VIEW data.v_country_annual_stats AS
SELECT 
    country,
    toYear(timestamp) AS year,
    avg(value) AS yearly_mean_cf 
FROM data.pvgis
GROUP BY 
    country, 
    year
ORDER BY 
    country, 
    year;