---v_invest_metrics

CREATE VIEW v_invest_metrics AS

SELECT 
    region_code,
    any(region_name) AS region_name,
    any(country) AS country,
    
    -- 1. YIELD (X-Axis): True overall average
    round((sum(total_sum) / sum(total_count)) * 100, 2) AS mean_value,
    
    -- 2. RISK (Y-Axis): Coefficient of Variation (CV)
    round((stddevSamp(yearly_mean) / nullIf(sum(total_sum) / sum(total_count), 0)) * 100, 2) AS risk_cv,
    
    -- 3. SEASONALITY (Color): Precise Winter Gap (0-1 scale)
    round((1 - (sum(winter_sum) / nullIf(sum(winter_count), 0)) / nullIf((sum(summer_sum) / nullIf(sum(summer_count), 0)), 0)), 3) AS winter_gap,
    
    -- 4. DATA FOR TOOLTIPS: Aggregated lookup data
    groupArray((year, round(avg(value) * 100, 2))) AS yearly_stats,
    sum(total_count) AS total_samples

FROM (
    SELECT 
        region_code,
        region_name,
        country,
        toYear(timestamp) AS year,
        
        sumIf(value, (month = 'june') OR (month = 'july') OR (month = 'august')) AS summer_sum,
        countIf(value, (month = 'june') OR (month = 'july') OR (month = 'august')) AS summer_count,
        
        sumIf(value, (month = 'december') OR (month = 'january') OR (month = 'february')) AS winter_sum,
        countIf(value, (month = 'december') OR (month = 'january') OR (month = 'february')) AS winter_count,
        
        sum(value) AS total_sum,
        count(value) AS total_count,
        avg(value) AS yearly_mean
        
    FROM data.pvgis
    GROUP BY 
        region_code, 
        region_name, 
        country, 
        year
)

GROUP BY 
    region_code;