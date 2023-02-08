import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

type CcProps = {
  labels: string[],
  values: any[]
};

const formatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',

  // These options are needed to round to whole numbers if that's what you want.
  //minimumFractionDigits: 0, // (this suffices for whole numbers, but will print 2500.10 as $2,500.1)
  //maximumFractionDigits: 0, // (causes 2500.99 to be printed as $2,501)
});

const ChartComponent = (props: CcProps) => {
  const { labels, values } = props; 

  const dataPoints = values.map(x => x.c);

  const options = {
    responsive: true,
    plugins: {
      tooltip: {
        callbacks: {
          label: function(context: any) {
            var index = context.parsed.x;
            return [`Open: ${formatter.format(values[index].o)}`,
              `Close: ${formatter.format(values[index].c)}`, 
              `High: ${formatter.format(values[index].h)}`,
              `Low: ${formatter.format(values[index].l)}`];
          }
        }
      },
      legend: {
        display: false,
      },
    },
  };

  const data = {
    labels,
    datasets: [
      {
        data: dataPoints,
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
      },
    ],
  };

  return <Line options={options} data={data} />;
}

export default ChartComponent;