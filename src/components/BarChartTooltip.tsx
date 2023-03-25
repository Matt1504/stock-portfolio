export const CustomTooltip = ({ active, payload, label }: any) => {
    if (active) {
      return (
        <div className="custom-chart-tooltip">
          <p className="chart-label">{label}</p>
          <p className="chart-desc">
            {payload?.[0].name}:{" "}
            <span style={{ color: payload?.[0].fill }}>
              ${payload?.[0].value?.toFixed(2)}
            </span>
          </p>
          {payload?.[1] && (
            <p className="chart-desc">
              {payload?.[1].name}:{" "}
              <span style={{ color: payload?.[1].fill }}>
                ${payload?.[1].value?.toFixed(2)}
              </span>
            </p>
          )}
        </div>
      );
    }
    return null;
  };