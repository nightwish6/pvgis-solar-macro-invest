/*;VIEW v_country_seasonal_bins */

CREATE VIEW data.v_country_seasonal_bins AS
SELECT 
    country,
    
    -- Season label for splitting into two curves (Summer/Winter)
    CASE 
        WHEN (month = 'june') OR (month = 'july') OR (month = 'august') THEN 'Summer'
        WHEN (month = 'december') OR (month = 'january') OR (month = 'february') THEN 'Winter'
        ELSE 'Other' 
    END AS season_label,
    
    -- Bin (bucket) for the histogram, rounded to 2 decimal places
    round(value, 2) AS h_value_bin,
    
    -- Count of hours falling into this specific bin for the region
    count(*) AS hours_count

FROM data.pvgis
WHERE 
    -- Filtering only for summer and winter months for clean comparison
    (month IN ('june', 'july', 'august')) 
    OR (month IN ('december', 'january', 'february'))
GROUP BY 
    country,
    season_label, 
    h_value_bin
ORDER BY 
    country, 
    season_label, 
    h_value_bin;