import React, { useState, useEffect } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface AnalyticsData {
  todayStats: {
    views: number;
    revenue: number;
    comments: number;
    subscribers: number;
  };
  revenueChart: {
    labels: string[];
    data: number[];
  };
  viewsChart: {
    labels: string[];
    data: number[];
  };
  topVideos: Array<{
    id: string;
    title: string;
    views: number;
    revenue: number;
    thumbnail_url?: string;
  }>;
  liveViewers: number;
}

interface AnalyticsDashboardProps {
  creatorWallet: string;
}

export default function AnalyticsDashboard({ creatorWallet }: AnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');

  useEffect(() => {
    fetchAnalytics();

    // Setup real-time subscriptions for live updates
    const interval = setInterval(fetchAnalytics, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [creatorWallet, timeRange]);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(
        `/api/creator/analytics?wallet=${creatorWallet}&range=${timeRange}`
      );

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-flix-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="glass-effect rounded-xl p-8 text-center">
        <p className="text-gray-400">No analytics data available yet</p>
      </div>
    );
  }

  const revenueChartData: ChartData<'line'> = {
    labels: analytics.revenueChart.labels,
    datasets: [
      {
        label: 'Revenue (USDC)',
        data: analytics.revenueChart.data,
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const viewsChartData: ChartData<'bar'> = {
    labels: analytics.viewsChart.labels,
    datasets: [
      {
        label: 'Views',
        data: analytics.viewsChart.data,
        backgroundColor: 'rgba(139, 92, 246, 0.8)',
        borderColor: 'rgb(139, 92, 246)',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#9CA3AF',
        },
      },
    },
    scales: {
      x: {
        ticks: { color: '#9CA3AF' },
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      y: {
        ticks: { color: '#9CA3AF' },
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
      },
    },
  };

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Analytics Dashboard</h2>
        <div className="flex space-x-2">
          {(['7d', '30d', '90d'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                timeRange === range
                  ? 'gradient-bg text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Today's Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="glass-effect p-6 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Today's Revenue</span>
            <span className="text-2xl">💰</span>
          </div>
          <div className="text-2xl font-bold text-green-400">
            ${analytics.todayStats.revenue.toFixed(2)}
          </div>
          <div className="text-xs text-gray-500 mt-1">USDC</div>
        </div>

        <div className="glass-effect p-6 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Today's Views</span>
            <span className="text-2xl">👁️</span>
          </div>
          <div className="text-2xl font-bold text-flix-primary">
            {analytics.todayStats.views.toLocaleString()}
          </div>
        </div>

        <div className="glass-effect p-6 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Comments</span>
            <span className="text-2xl">💬</span>
          </div>
          <div className="text-2xl font-bold text-flix-secondary">
            {analytics.todayStats.comments}
          </div>
        </div>

        <div className="glass-effect p-6 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Subscribers</span>
            <span className="text-2xl">⭐</span>
          </div>
          <div className="text-2xl font-bold text-yellow-400">
            {analytics.todayStats.subscribers}
          </div>
        </div>

        <div className="glass-effect p-6 rounded-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Live Viewers</span>
            <span className="text-2xl animate-pulse">🔴</span>
          </div>
          <div className="text-2xl font-bold text-red-400">
            {analytics.liveViewers}
          </div>
          <div className="text-xs text-gray-500 mt-1">watching now</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="glass-effect p-6 rounded-xl">
          <h3 className="text-lg font-semibold text-white mb-4">Revenue Over Time</h3>
          <div style={{ height: '300px' }}>
            <Line data={revenueChartData} options={chartOptions} />
          </div>
        </div>

        {/* Views Chart */}
        <div className="glass-effect p-6 rounded-xl">
          <h3 className="text-lg font-semibold text-white mb-4">Views Over Time</h3>
          <div style={{ height: '300px' }}>
            <Bar data={viewsChartData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Top Performing Videos */}
      <div className="glass-effect p-6 rounded-xl">
        <h3 className="text-lg font-semibold text-white mb-4">Top Performing Videos</h3>
        <div className="space-y-3">
          {analytics.topVideos.map((video, index) => (
            <div
              key={video.id}
              className="flex items-center space-x-4 p-4 bg-white/5 rounded-lg hover:bg-white/10 transition"
            >
              <div className="text-2xl font-bold text-flix-primary w-8">
                #{index + 1}
              </div>

              {video.thumbnail_url && (
                <img
                  src={video.thumbnail_url}
                  alt={video.title}
                  className="w-24 h-14 object-cover rounded"
                />
              )}

              <div className="flex-1">
                <div className="font-medium text-white">{video.title}</div>
                <div className="flex items-center space-x-4 mt-1 text-sm text-gray-400">
                  <span>👁️ {video.views.toLocaleString()} views</span>
                  <span>💰 ${video.revenue.toFixed(2)} earned</span>
                </div>
              </div>
            </div>
          ))}

          {analytics.topVideos.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              No video data available yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
