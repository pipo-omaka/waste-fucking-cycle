// CircularEconomy: show visualizations. Uses backend data when available.
import { useEffect, useState } from 'react';
import { TrendingUp, Package, DollarSign, ShoppingCart, Users, Globe, Sprout } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Progress } from './ui/progress';
import { getVisualizationWaste, getAllProducts } from '../apiServer';

export function CircularEconomy() {
  // Small timeseries placeholder (keep until we add a time-series endpoint)
  const [lineData] = useState<any[]>([
    { month: 'ม.ค.', waste: 180, value: 32000 },
    { month: 'ก.พ.', waste: 210, value: 35000 },
    { month: 'มี.ค.', waste: 195, value: 33000 },
    { month: 'เม.ย.', waste: 240, value: 38000 },
    { month: 'พ.ค.', waste: 280, value: 42000 },
    { month: 'มิ.ย.', waste: 320, value: 48000 },
  ]);

  // Pie data - will be loaded from backend
  const [pieData, setPieData] = useState<any[]>([
    { name: 'มูลโค', value: 45, color: '#10b981' },
    { name: 'มูลไก่', value: 35, color: '#3b82f6' },
    { name: 'มูลหมู', value: 20, color: '#f59e0b' },
  ]);

  // Stats derived from backend
  const [totalWaste, setTotalWaste] = useState<number | null>(null);
  const [totalValue, setTotalValue] = useState<number | null>(null);
  const [totalTransactions, setTotalTransactions] = useState<number | null>(null);
  const [totalFarms, setTotalFarms] = useState<number | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadStats = async () => {
      setIsLoadingStats(true);
      try {
        // 1) visualization endpoint gives breakdown and quantities
        const viz = await getVisualizationWaste();
        const details = viz?.data?.data?.details || {};

        const pie = Object.keys(details).map((k, i) => ({
          name: k,
          value: details[k].totalQuantity || 0,
          color: ['#10b981', '#3b82f6', '#f59e0b', '#a855f7'][i % 4]
        }));

        const total = pie.reduce((s, p) => s + (p.value || 0), 0);

        // 2) products endpoint for value/transactions and participating farms
        const productsResp = await getAllProducts();
        const products = productsResp?.data?.data || [];
        const value = products.reduce((s: number, p: any) => s + ((p.price || 0) * (p.quantity || 0)), 0);
        const transactions = products.length;
        const farms = new Set(products.map((p: any) => String(p.userId || p.uid || p.sellerId || ''))).size;

        if (!mounted) return;
        setPieData(pie.length ? pie : []);
        setTotalWaste(total);
        setTotalValue(value);
        setTotalTransactions(transactions);
        setTotalFarms(farms);
      } catch (err) {
        console.error('CircularEconomy: failed to load stats', err);
      } finally {
        if (mounted) setIsLoadingStats(false);
      }
    };

    loadStats();
    return () => { mounted = false; };
  }, []);

  // ข้อมูลฟาร์มยอดนิยม
  const topFarms = [
    { rank: 1, name: 'ฟาร์มไก่ไข่หนองหงส์', transactions: 45, value: 67500 },
    { rank: 2, name: 'ฟาร์มโคไทยใหญ่', transactions: 38, value: 76000 },
    { rank: 3, name: 'ฟาร์มหมูบุตรา', transactions: 32, value: 57600 },
    { rank: 4, name: 'ฟาร์มไก่ภูเก็ต', transactions: 28, value: 61600 },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl mb-2">สถิติและการวิเคราะห์</h1>
          <p className="text-gray-600">ข้อมูลการแลกเปลี่ยนของเสียที่แสดงสถานะทางการเกษตร</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* ของเสียรวม */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">ของเสียรวม (เดือนนี้)</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl">{isLoadingStats ? 'กำลังโหลด...' : (totalWaste != null ? totalWaste.toLocaleString() : '0')}</span>
                    <span className="text-gray-600">ตัน</span>
                  </div>
                  <p className="text-sm text-green-600 mt-2">{isLoadingStats ? '' : '+14.3% จากเดือนที่แล้ว'}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Package className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* มูลค่า */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">มูลค่า (เดือนนี้)</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl">{isLoadingStats ? 'กำลังโหลด...' : (totalValue != null ? `฿${totalValue.toLocaleString()}` : '฿0')}</span>
                    <span className="text-gray-600">บาท</span>
                  </div>
                  <p className="text-sm text-blue-600 mt-2">{isLoadingStats ? '' : '+14.3% จากเดือนที่แล้ว'}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* รายการซื้อขาย */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">รายการซื้อขาย</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl">{isLoadingStats ? 'กำลังโหลด...' : (totalTransactions != null ? totalTransactions.toLocaleString() : '0')}</span>
                    <span className="text-gray-600">ครั้ง</span>
                  </div>
                  <p className="text-sm text-pink-600 mt-2">{isLoadingStats ? '' : '+8.3% จากเดือนที่แล้ว'}</p>
                </div>
                <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center">
                  <ShoppingCart className="w-6 h-6 text-pink-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ผู้ใช้งานใหม่ */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">ผู้ใช้งานใหม่</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl">{isLoadingStats ? 'กำลังโหลด...' : (totalFarms != null ? totalFarms.toLocaleString() : '0')}</span>
                    <span className="text-gray-600">ราย</span>
                  </div>
                  <p className="text-sm text-orange-600 mt-2">{isLoadingStats ? '' : '+12.0% จากเดือนที่แล้ว'}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Line Chart */}
          <Card>
            <CardHeader>
              <CardTitle>แนวโน้มการเติบโต</CardTitle>
              <CardDescription>เปรียบเทียบของเสียรีไซเคิลกับมูลค่ารายได้</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={lineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" stroke="#6b7280" />
                  <YAxis yAxisId="left" stroke="#10b981" />
                  <YAxis yAxisId="right" orientation="right" stroke="#3b82f6" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend 
                    formatter={(value) => {
                      if (value === 'waste') return 'ของเสียรีไซเคิล (ตัน)';
                      if (value === 'value') return 'มูลค่า (บาท)';
                      return value;
                    }}
                  />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="waste" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={{ fill: '#10b981', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="value" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle>สัดส่วนประเภทของเสีย</CardTitle>
              <CardDescription>แบ่งตามประเภทของเสีย</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => totalWaste ? `${entry.name}: ${((entry.value / (totalWaste || 1)) * 100).toFixed(1)}%` : `${entry.name}: ${entry.value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => totalWaste ? `${value} ตัน (${((value/(totalWaste||1))*100).toFixed(1)}%)` : `${value}`}
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Top Farms */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>ฟาร์มยอดนิยม</CardTitle>
              <CardDescription>ฟาร์มที่มียอดซื้อขายสูงสุดในเดือนนี้</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topFarms.map((farm) => (
                  <div key={farm.rank} className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-lg flex items-center justify-center text-white flex-shrink-0">
                      <span className="text-lg">{farm.rank}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between mb-1">
                        <p className="font-medium truncate">{farm.name}</p>
                        <p className="text-sm text-emerald-600 font-medium ml-2">฿{farm.value.toLocaleString()}</p>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{farm.transactions} รายการ</p>
                      <div className="flex items-center gap-2">
                        <Progress value={(farm.value / 76000) * 100} className="flex-1" />
                        <span className="text-xs text-gray-500">มูลค่ารวม</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Positive Impact */}
        <div className="mt-8">
          <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-500 rounded-2xl p-8 text-white">
            <h2 className="text-xl font-bold mb-2">ผลการรับเชิงบวก</h2>
            <p className="text-emerald-50 mb-6">การช่วยส่วนรวมต่อเศรษฐกิจหมุนเวียนและสิ่งแวดล้อม</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* ของเสียที่นำกลับคุณย้อน */}
              <div className="text-center">
                <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Globe className="w-8 h-8 text-white" />
                </div>
                <div className="text-4xl font-bold mb-2">2,450</div>
                <p className="text-emerald-50">ตัน ของเสียที่นำกลับคุณย้อน</p>
              </div>

              {/* มูลค่าเศรษฐกิจ */}
              <div className="text-center">
                <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <DollarSign className="w-8 h-8 text-white" />
                </div>
                <div className="text-4xl font-bold mb-2">฿184,500</div>
                <p className="text-emerald-50">มูลค่าเศรษฐกิจที่สร้างสรรค์</p>
              </div>

              {/* ฟาร์มที่เข้าร่วม */}
              <div className="text-center">
                <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sprout className="w-8 h-8 text-white" />
                </div>
                <div className="text-4xl font-bold mb-2">1,234</div>
                <p className="text-emerald-50">ฟาร์มที่เข้าร่วมระบบ</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}