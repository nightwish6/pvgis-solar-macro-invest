
CREATE VIEW data.v_region_annual_stats AS
SELECT 
    region_name,
    country,
    toYear(timestamp) AS year,
    avg(value) AS yearly_mean_cf 
FROM data.pvgis
GROUP BY 
    region_name, 
    country,
    year
ORDER BY 
    region_name, 
    year;