import { useState, useEffect } from 'react'; // รวม useState และ useEffect ไว้ที่นี่
import { Sprout, Calculator, TrendingUp, Leaf, Droplets, BookOpen, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
// ตรวจสอบ path นี้ให้ถูกต้อง ถ้าไม่มีไฟล์นี้ให้ลบ import นี้ออกและแก้ส่วนที่เรียกใช้
import { getAllProducts } from '../apiServer'; 

// ----------------------------------------------------
// Main Component (ตัวที่ Export ออกไป)
// ----------------------------------------------------

interface FertilizerAdvisorProps {
  defaultTab?: 'recommendation' | 'calculator';
  onTabChange?: (tab: 'recommendation' | 'calculator') => void;
}

export function FertilizerAdvisor({ defaultTab = 'recommendation', onTabChange }: FertilizerAdvisorProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  const handleTabChange = (tab: 'recommendation' | 'calculator') => {
    setActiveTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <Tabs value={activeTab} onValueChange={handleTabChange as any} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="recommendation">
              <BookOpen className="w-4 h-4 mr-2" />
              คำแนะนำปุ๋ย
            </TabsTrigger>
            <TabsTrigger value="calculator">
              <Calculator className="w-4 h-4 mr-2" />
              คำนวณ NPK
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recommendation">
            <FertilizerRecommendation />
          </TabsContent>

          <TabsContent value="calculator">
            <NPKCalculatorContent />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// Sub Components (ส่วนประกอบย่อย)
// ----------------------------------------------------

function FertilizerRecommendation() {
  const [cropType, setCropType] = useState('');
  const [area, setArea] = useState('');
  const [growthStage, setGrowthStage] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (showResults) {
      setLoading(true);
      // ถ้ายังไม่มี apiServer ให้ comment block นี้ไว้ก่อน
      getAllProducts()
        .then(res => setProducts(res.data.data || []))
        .catch(err => setError('ไม่สามารถโหลดข้อมูลสินค้าได้'))
        .finally(() => setLoading(false));
    }
  }, [showResults]);

  const handleCalculate = () => {
    if (cropType && area && growthStage) {
      setShowResults(true);
    }
  };

  const cropTypeThai: Record<string, string> = {
    vegetables: 'ผักใบ',
    fruits: 'ผลไม้',
    rice: 'ข้าว',
    corn: 'ข้าวโพด',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Sprout className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-2xl mb-2">ระบบแนะนำปุ๋ย</h1>
        <p className="text-gray-600">คำนวณปุ๋ยที่เหมาะสมตามชนิดของพืชและขนิดของพื้นที่</p>
      </div>

      {/* Input Form */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="crop-type" className="mb-2 block">ชนิดพืช</Label>
              <Select value={cropType} onValueChange={setCropType}>
                <SelectTrigger id="crop-type">
                  <SelectValue placeholder="เลือกชนิดพืช" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vegetables">ผักใบ</SelectItem>
                  <SelectItem value="fruits">ผลไม้</SelectItem>
                  <SelectItem value="rice">ข้าว</SelectItem>
                  <SelectItem value="corn">ข้าวโพด</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="area" className="mb-2 block">พื้นที่ปลูก (ไร่)</Label>
              <Input
                id="area"
                type="number"
                placeholder="0"
                value={area}
                onChange={(e) => setArea(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="growth-stage" className="mb-2 block">ระยะเจริญเติบโต</Label>
              <Select value={growthStage} onValueChange={setGrowthStage}>
                <SelectTrigger id="growth-stage">
                  <SelectValue placeholder="เลือกระยะเจริญเติบโต" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="seedling">ระยะต้นเริ่มต้น</SelectItem>
                  <SelectItem value="vegetative">ระยะเจริญเติบโต</SelectItem>
                  <SelectItem value="flowering">ระยะผลไม้</SelectItem>
                  <SelectItem value="fruiting">ระยะผลผลไม้</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={handleCalculate} 
              className="w-full bg-green-500 hover:bg-green-600 text-white"
              disabled={!cropType || !area || !growthStage}
            >
              คำนวณ
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {showResults && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>ผลการคำนวณ</CardTitle>
              <CardDescription>ปุ๋ยที่แนะนำสำหรับ{cropTypeThai[cropType] || cropType} พื้นที่ {area} ไร่</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="text-sm text-blue-900 mb-2">💡 คำแนะนำ</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• ควรใส่ปุ๋ยประมาณ {(Number(area) * 50).toFixed(0)} กก. ต่อครั้ง</li>
                  <li>• แบ่งใส่ 2-3 ครั้งในช่วงระยะนี้</li>
                  <li>• ควรใส่ปุ๋ยในช่วงเช้าหรือเย็น เมื่อดินมีความชื้น</li>
                  <li>• หลังใส่ปุ๋ยควรรดน้ำเบาๆ เพื่อให้ธาตุอาหารละลายซึมสู่ดิน</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>แหล่งซื้อที่แนะนำ</CardTitle>
              <CardDescription>ฟาร์มที่มีปุ๋ยตรงตามความต้องการของคุณ</CardDescription>
            </CardHeader>
            <CardContent>
              {loading && <div className="text-gray-500">กำลังโหลดข้อมูลสินค้า...</div>}
              {error && <div className="text-red-500">{error}</div>}
              <div className="space-y-4">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-green-500 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="text-gray-900 mb-1">{product.title}</h4>
                        <p className="text-sm text-gray-600">{product.farmName}</p>
                      </div>
                      <Badge className="bg-green-500">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        {product.verified ? 'ยืนยันแล้ว' : 'ยังไม่ยืนยัน'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="bg-gray-50 rounded p-2 text-center">
                        <div className="text-xs text-gray-500">N</div>
                        <div className="text-sm text-green-600">{product.npk?.n ?? '-'}</div>
                      </div>
                      <div className="bg-gray-50 rounded p-2 text-center">
                        <div className="text-xs text-gray-500">P</div>
                        <div className="text-sm text-blue-600">{product.npk?.p ?? '-'}</div>
                      </div>
                      <div className="bg-gray-50 rounded p-2 text-center">
                        <div className="text-xs text-gray-500">K</div>
                        <div className="text-sm text-orange-600">{product.npk?.k ?? '-'}</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="text-lg text-green-600">฿{product.price}/กก.</span>
                        <span className="flex items-center gap-1">
                          <Leaf className="w-4 h-4" />
                          {product.distance ?? '-'} กม.
                        </span>
                      </div>
                      <Button size="sm" className="bg-green-500 hover:bg-green-600">
                        ดูรายละเอียด
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <Button variant="outline" className="w-full mt-4">
                <Leaf className="w-4 h-4 mr-2" />
                ดูแหล่งซื้อใกล้ฉันบนแผนที่
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function NPKCalculatorContent() {
  const [animalType, setAnimalType] = useState('');
  const [quantity, setQuantity] = useState('');
  const [feedType, setFeedType] = useState('');
  const [showResults, setShowResults] = useState(false);

  const handleCalculate = () => {
    if (animalType && quantity && feedType) {
      setShowResults(true);
    }
  };

  const npkData: Record<string, { n: number; p: number; k: number }> = {
    chicken: { n: 2.33, p: 2.52, k: 2.45 },
    cow: { n: 1.40, p: 0.412, k: 1.65 },
    pig: { n: 1.88, p: 3.50, k: 1.00 },
  };

  // ฟังก์ชันคำนวณ Logic (Dynamic)
  const getRecommendations = () => {
    if (!animalType || !quantity || !feedType) return null;

    const qtyNum = Number(quantity);
    let plants: any[] = [];
    let instructions: any[] = [];

    switch (animalType) {
      case 'chicken':
        plants = [
          { name: "ผักกินใบ/ผักสวนครัว", reason: "ไนโตรเจน (N) สูง ช่วยเร่งการเจริญเติบโตของลำต้นและใบได้ดีเยี่ยม" },
          { name: "ไม้ผล (ช่วงสะสมอาหาร)", reason: "มีฟอสฟอรัส (P) และโพแทสเซียม (K) สูง ช่วยในการสร้างดอกและผล" },
          { name: "พืชไร่ (ข้าวโพด/อ้อย)", reason: "ธาตุอาหารครบถ้วน เหมาะกับพืชที่ต้องการปุ๋ยปริมาณมาก" }
        ];
        instructions.push({
          step: 1,
          title: "การหมัก (สำคัญมาก)",
          desc: "มูลไก่มีความเค็มและกรดสูง (Uric acid) ต้องหมักอย่างน้อย 1-2 เดือนเพื่อให้คลายความร้อนและลดความเป็นกรด"
        });
        break;
      case 'cow':
        plants = [
          { name: "พืชกินใบระยะต้นกล้า", reason: "ค่า N ไม่สูงเกินไป ไม่ทำให้ต้นกล้า 'น็อคปุ๋ย' (Fertilizer Burn)" },
          { name: "พืชตระกูลหญ้า", reason: "ช่วยบำรุงต้นและใบอย่างค่อยเป็นค่อยไป" },
          { name: "ไม้ดัด/ไม้ประดับ", reason: "เน้นบำรุงดินให้ร่วนซุย รากเดินดี เหมาะกับไม้ที่ต้องการดินโปร่ง" }
        ];
        instructions.push({
          step: 1,
          title: "การเตรียมดิน",
          desc: "มูลวัวเป็น 'ปุ๋ยเย็น' เหมาะมากสำหรับการรองก้นหลุมก่อนปลูกเพื่อปรับโครงสร้างดินเหนียวหรือดินทราย"
        });
        break;
      case 'pig':
        plants = [
          { name: "พืชดอก/ไม้ดอก", reason: "ฟอสฟอรัส (P) สูงถึง 3.50% ช่วยกระตุ้นการออกดอกและระบบรากได้ดีที่สุด" },
          { name: "พืชหัว (มัน/เผือก)", reason: "ช่วยพัฒนาระบบรากและหัว แต่ควรเสริม K เพิ่มเติมหากต้องการเน้นขนาดหัว" },
          { name: "ผักกินผล (มะเขือ/พริก)", reason: "เร่งการติดดอกออกผล" }
        ];
        instructions.push({
          step: 1,
          title: "การจัดการ",
          desc: "มูลสุกรมีความชื้นสูง ควรตากแห้งหรือเข้าเครื่องอัดเม็ดก่อนใช้ เพื่อลดกลิ่นและเชื้อโรค"
        });
        break;
    }

    if (feedType === 'concentrate') {
      instructions.push({
        step: 2,
        title: "ความเข้มข้นสูง (อาหารข้น)",
        desc: "เนื่องจากสัตว์กินอาหารข้น มูลจะมีธาตุอาหารตกค้างสูง ควรใช้น้อยกว่าอัตราปกติเล็กน้อยในช่วงแรกเพื่อดูอาการพืช"
      });
    } else if (feedType === 'grass') {
      instructions.push({
        step: 2,
        title: "เน้นอินทรียวัตถุ (หญ้า/ฟาง)",
        desc: "มูลจะมีกากใยสูงมาก ดีต่อการแก้ดินแน่น แต่ธาตุอาหารอาจปล่อยออกมาช้ากว่าปกติ"
      });
    } else {
      instructions.push({
        step: 2,
        title: "การใช้ทั่วไป (อาหารผสม)",
        desc: "สามารถใช้อัตราส่วนมาตรฐานได้ตามคำแนะนำทั่วไป"
      });
    }

    if (qtyNum > 1000) {
      instructions.push({
        step: 3,
        title: "การจัดการปริมาณมาก (>1 ตัน)",
        desc: `ปริมาณ ${qtyNum} กก. แนะนำให้ใช้เครื่องหว่านปุ๋ยหรือไถกลบพร้อมเตรียมดินแปลงใหญ่ เพื่อความสม่ำเสมอ`
      });
    } else {
      instructions.push({
        step: 3,
        title: "การจัดการปริมาณน้อย",
        desc: `ปริมาณ ${qtyNum} กก. เหมาะสำหรับโรยรอบทรงพุ่มหรือผสมดินปลูกในกระถาง`
      });
    }

    return { plants, instructions };
  };

  const recommendations = showResults ? getRecommendations() : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Calculator className="w-10 h-10 text-blue-600" />
        </div>
        <h1 className="text-2xl mb-2">เครื่องคำนวณ NPK</h1>
        <p className="text-gray-600">ประมวลคำคุณภาพทางเคมีของเสียจากชนิดสัตว์และปริมาณ</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
        <Leaf className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-blue-900 mb-1">
            <strong>ระบบประมวลผลค่า NPK โดยประมาณจากชนิดสัตว์และอาหารที่ให้</strong>
          </p>
          <p className="text-xs text-blue-700">
            💡 <strong>เคล็ดลับ:</strong> ค่าที่ได้เป็นการประมาณการเบื้องต้น ควรตรวจวิเคราะห์เพื่อความแม่นยำมากยิ่งขึ้น
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ข้อมูลสำหรับของคุณ</CardTitle>
          <CardDescription>กรอกข้อมูลเพื่อคำนวณค่า NPK</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="animal-type" className="mb-2 block">ชนิดสัตว์</Label>
            <Select value={animalType} onValueChange={setAnimalType}>
              <SelectTrigger id="animal-type">
                <SelectValue placeholder="เลือกชนิดสัตว์" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="chicken">ไก่</SelectItem>
                <SelectItem value="cow">โค</SelectItem>
                <SelectItem value="pig">สุกร</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="feed-type" className="mb-2 block">ชนิดอาหารที่ให้</Label>
            <Select value={feedType} onValueChange={setFeedType}>
              <SelectTrigger id="feed-type">
                <SelectValue placeholder="เลือกชนิดอาหาร" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="concentrate">อาหารข้น (สูตรสำเร็จรูป)</SelectItem>
                <SelectItem value="grass">หญ้า/ฟาง</SelectItem>
                <SelectItem value="mixed">อาหารผสม</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="quantity" className="mb-2 block">ปริมาณมูลสัตว์ (กก.)</Label>
            <Input
              id="quantity"
              type="number"
              placeholder="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>

          <Button 
            onClick={handleCalculate} 
            className="w-full bg-blue-500 hover:bg-blue-600 text-white"
            disabled={!animalType || !quantity || !feedType}
          >
            <Calculator className="w-4 h-4 mr-2" />
            คำนวณค่า NPK
          </Button>
        </CardContent>
      </Card>

      {showResults && animalType && recommendations && (
        <>
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>สรุปข้อมูลที่คุณกรอก</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">ชนิดสัตว์:</span> {animalType === 'chicken' ? 'ไก่' : animalType === 'cow' ? 'โค' : 'สุกร'}
                </div>
                <div>
                  <span className="font-medium text-gray-700">ชนิดอาหาร:</span> {feedType === 'concentrate' ? 'อาหารข้น' : feedType === 'grass' ? 'หญ้า/ฟาง' : 'อาหารผสม'}
                </div>
                <div>
                  <span className="font-medium text-gray-700">ปริมาณ:</span> {quantity} กก.
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>ผลการคำนวณค่า NPK</CardTitle>
              <CardDescription>
                ค่าคุณภาพทางเคมีของเสียจาก{animalType === 'chicken' ? 'ไก่' : animalType === 'cow' ? 'โค' : 'สุกร'} ({quantity} กก.)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-xs text-gray-600 mb-2">N (ไนโตรเจน)</div>
                  <div className="text-3xl text-green-600 mb-1">{npkData[animalType].n}</div>
                  <div className="text-xs text-gray-500">% ของน้ำหนักสด</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <div className="text-xs text-gray-600 mb-2">P (ฟอสฟอรัส)</div>
                  <div className="text-3xl text-blue-600 mb-1">{npkData[animalType].p}</div>
                  <div className="text-xs text-gray-500">% ของน้ำหนักสด</div>
                </div>
                <div className="bg-orange-50 rounded-lg p-4 text-center">
                  <div className="text-xs text-gray-600 mb-2">K (โพแทสเซียม)</div>
                  <div className="text-3xl text-orange-600 mb-1">{npkData[animalType].k}</div>
                  <div className="text-xs text-gray-500">% ของน้ำหนักสด</div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm text-gray-900 mb-2">📊 ปริมาณธาตุอาหารที่ได้ (กก.)</h4>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600">N: </span>
                    <span className="text-green-600">{((Number(quantity) * npkData[animalType].n) / 100).toFixed(2)} กก.</span>
                  </div>
                  <div>
                    <span className="text-gray-600">P: </span>
                    <span className="text-blue-600">{((Number(quantity) * npkData[animalType].p) / 100).toFixed(2)} กก.</span>
                  </div>
                  <div>
                    <span className="text-gray-600">K: </span>
                    <span className="text-orange-600">{((Number(quantity) * npkData[animalType].k) / 100).toFixed(2)} กก.</span>
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-2">* ค่านี้เป็นการประมาณการเบื้องต้น อาจแตกต่างตามสภาพแวดล้อมและอาหารที่ให้</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>พืชที่เหมาะสม</CardTitle>
              <CardDescription>
                วิเคราะห์จากสัดส่วน NPK ของมูล{animalType === 'chicken' ? 'ไก่' : animalType === 'cow' ? 'โค' : 'สุกร'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {recommendations.plants.map((plant, index) => (
                  <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 hover:border-green-400 transition-colors">
                    <div className="flex items-start gap-2">
                      <Sprout className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-gray-900 mb-1">{plant.name}</p>
                        <p className="text-xs text-gray-600">{plant.reason}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>คำแนะนำการใช้เฉพาะคุณ</CardTitle>
              <CardDescription>ปรับปรุงตามชนิดอาหารและปริมาณ {quantity} กก.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recommendations.instructions.map((item, index) => (
                  <div key={index} className="flex gap-3 p-4 bg-gray-50 rounded-lg border border-gray-100">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold ${
                      index === 0 ? 'bg-green-100 text-green-700' : 
                      index === 1 ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {item.step}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 mb-1">{item.title}</p>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}