
CREATE VIEW data.v_country_percentiles AS
SELECT 
    country,
    quantile(0.1)(yearly_mean_cf) AS p10_cf,
    quantile(0.5)(yearly_mean_cf) AS p50_cf,
    quantile(0.9)(yearly_mean_cf) AS p90_cf,
    quantile(0.99)(yearly_mean_cf) AS p99_cf,
    quantile(0.9)(yearly_mean_cf) - quantile(0.1)(yearly_mean_cf) AS p90_p10_spread
FROM data.v_country_annual_stats
GROUP BY country
ORDER BY p50_cf DESC;