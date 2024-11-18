'use client';

import React, { useState, useEffect } from 'react';
import { LineChart, XAxis, YAxis, Tooltip, Line, CartesianGrid } from 'recharts';
import { 
  AlertCircle, 
  Clock, 
  RefreshCw, 
  Search, 
  Users, 
  Download, 
  FileSpreadsheet, 
  CheckCircle 
} from 'lucide-react';

export default function Dashboard() {
  const [isClient, setIsClient] = useState(false);
  const [profileUrl, setProfileUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [stats, setStats] = useState({
    totalGifs: 0,
    pendingGifs: 0,
    completedGifs: 0,
    lastUpdate: "",
    processingStatus: "waiting"
  });

  const [rankingData, setRankingData] = useState([]);
  const [gifData, setGifData] = useState([]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const extractUsername = (url) => {
    const match = url.match(/users\/([^/]+)$/);
    if (match) return match[1];
    return url;
};


    // Inside your Dashboard.js component
  const fetchUserData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
        const username = extractUsername(profileUrl);
        if (!username) {
            throw new Error('Please enter a valid Tenor profile URL or username');
        }

        const response = await fetch(`/api/user-data?username=${username}`);
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Failed to fetch data');
        }

        // Set GIF data
        setGifData(data.rankings);
        
        // Update stats
        setStats({
            totalGifs: parseInt(data.stats.totalGifs) || 0,
            pendingGifs: parseInt(data.stats.pendingGifs) || 0,
            completedGifs: parseInt(data.stats.completedGifs) || 0,
            lastUpdate: data.stats.lastUpdate,
            processingStatus: data.stats.processingStatus
        });

        // Update ranking data with proper type checking
        if (data.rankings?.length > 0) {
            const trends = data.rankings
                .slice(0, 7)
                .map(r => ({
                    date: r.last_updated,
                    // Safely handle the rank value regardless of format
                    avgRank: typeof r.updated_rank === 'string' && r.updated_rank.startsWith('#')
                        ? parseInt(r.updated_rank.substring(1)) || 0
                        : parseInt(r.updated_rank) || 0
                }))
                .filter(item => !isNaN(item.avgRank));
            
            setRankingData(trends);
        } else {
            setRankingData([]);
        }

    } catch (error) {
        console.error('Error fetching data:', error);
        setError(error.message);
        // Reset states
        setGifData([]);
        setRankingData([]);
        setStats({
            totalGifs: 0,
            pendingGifs: 0,
            completedGifs: 0,
            lastUpdate: 'N/A',
            processingStatus: 'error'
        });
    } finally {
        setIsLoading(false);
    }
};
  const exportToCSV = (dataType) => {
    let data = [];
    let filename = '';

    switch(dataType) {
      case 'rankings':
        data = gifData;
        filename = 'tenor_rankings.csv';
        break;
      case 'stats':
        data = [{
          total_gifs: stats.totalGifs,
          pending_gifs: stats.pendingGifs,
          completed_gifs: stats.completedGifs,
          last_update: stats.lastUpdate,
          status: stats.processingStatus
        }];
        filename = 'tenor_stats.csv';
        break;
      default:
        return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => JSON.stringify(row[header])).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Tenor GIF Tracking Dashboard</h1>
          <div className="flex gap-4">
            <button
              onClick={() => exportToCSV('rankings')}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-all shadow-sm"
              disabled={gifData.length === 0}
            >
              <FileSpreadsheet className="h-5 w-5" />
              Export Rankings
            </button>
            <button
              onClick={() => exportToCSV('stats')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-all shadow-sm"
              disabled={gifData.length === 0}
            >
              <Download className="h-5 w-5" />
              Export Stats
            </button>
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4 mb-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-full">
              <AlertCircle className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-800">System Status</h3>
              <p className="text-blue-600 mt-1">
                Processing is <span className="font-medium">{stats.processingStatus}</span>
                <span className="mx-2">•</span>
                Last update: <span className="font-medium">{stats.lastUpdate}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard 
            title="Total GIFs"
            value={stats.totalGifs}
            icon={<Users className="h-6 w-6" />}
          />
          <StatCard 
            title="Pending"
            value={stats.pendingGifs}
            icon={<Clock className="h-6 w-6" />}
            variant="warning"
          />
          <StatCard 
            title="Completed"
            value={stats.completedGifs}
            icon={<CheckCircle className="h-6 w-6" />}
            variant="success"
          />
          <StatCard 
            title="Last Updated"
            value={stats.lastUpdate}
            icon={<RefreshCw className="h-6 w-6" />}
          />
        </div>

        {isClient && rankingData.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow-sm mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Average Ranking Trend</h2>
            <div className="overflow-x-auto">
              <LineChart width={800} height={300} data={rankingData}>
                <XAxis dataKey="date" stroke="#4B5563" />
                <YAxis reversed stroke="#4B5563" />
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white',
                    border: '1px solid #E5E7EB',
                    borderRadius: '0.5rem',
                    padding: '0.75rem'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="avgRank" 
                  stroke="#2563EB" 
                  strokeWidth={2}
                  isAnimationActive={false}
                  dot={{ stroke: '#2563EB', strokeWidth: 2, fill: 'white', r: 4 }}
                  activeDot={{ r: 6, stroke: '#2563EB', strokeWidth: 2, fill: '#3B82F6' }}
                />
              </LineChart>
            </div>
          </div>
        )}

        <div className="grid gap-8">
        <div className="bg-white p-8 rounded-lg shadow-sm">
            <div className="max-w-3xl mx-auto">
            <label htmlFor="profile-url" className="block text-lg font-semibold text-gray-700 mb-2">
                Enter Tenor Profile URL
            </label>
            <p className="text-sm text-gray-500 mb-4">
                Enter the full URL of a Tenor profile (e.g., https://tenor.com/users/swissmote)
            </p>
            <div className="flex gap-4">
                <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-400">https://tenor.com/users/</span>
                </div>
                <input
                    id="profile-url"
                    type="text"
                    placeholder="username"
                    className="w-full pl-[190px] pr-4 py-4 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-gray-700 bg-gray-50 hover:bg-white"
                    value={profileUrl}
                    onChange={(e) => {
                    const input = e.target.value;
                    // Remove the prefix if user pastes full URL
                    const username = input.replace('https://tenor.com/users/', '');
                    setProfileUrl(username);
                    }}
                />
                </div>
                <button 
                className={`px-8 py-4 rounded-lg flex items-center gap-2 transition-all shadow-sm min-w-[160px] justify-center ${
                    isLoading
                    ? 'bg-gray-100 text-gray-400'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
                onClick={fetchUserData}
                disabled={isLoading || !profileUrl.trim()}
                >
                {isLoading ? (
                    <>
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    Processing...
                    </>
                ) : (
                    <>
                    <Search className="h-5 w-5" />
                    Process Profile
                    </>
                )}
                </button>
            </div>
            {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex gap-2 items-start">
                    <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-red-600">{error}</p>
                </div>
                </div>
            )}
            </div>
        </div>

          {gifData.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-800">Recent GIF Rankings</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="px-6 py-4 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider rounded-tl-lg">
                        GIF URL
                      </th>
                      <th className="px-6 py-4 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Search Term
                      </th>
                      <th className="px-6 py-4 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Current Rank
                      </th>
                      <th className="px-6 py-4 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Filter Keyword
                      </th>
                      <th className="px-6 py-4 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider rounded-tr-lg">
                        Last Updated
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {gifData.map((gif, index) => (
                      <tr key={gif._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <a 
                              href={gif.gif_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 truncate max-w-md hover:underline"
                            >
                              {gif.gif_url}
                            </a>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-sm rounded-full bg-blue-100 text-blue-800">
                            {gif.search_term}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                            #{gif.updated_rank}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-sm rounded-full bg-purple-100 text-purple-800">
                            {gif.filter_keyword}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {gif.last_updated}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const StatCard = ({ title, value, icon, variant = "default" }) => {
  const variants = {
    default: "bg-gradient-to-br from-blue-50 to-blue-100 text-blue-700",
    warning: "bg-gradient-to-br from-yellow-50 to-yellow-100 text-yellow-700",
    success: "bg-gradient-to-br from-green-50 to-green-100 text-green-700"
  };

  return (
    <div className={`${variants[variant]} p-6 rounded-lg shadow-sm transition-all duration-300 hover:shadow-md`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium mb-1 opacity-75">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        <div className="p-2 bg-white bg-opacity-50 rounded-lg">
          {icon}
        </div>
      </div>
    </div>
  );
};