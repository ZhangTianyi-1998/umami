'use client';
import { WorldMap } from '@/components/metrics/WorldMap';
export function MapPreview() {
  return (
    <main style={{ maxWidth: 1100, margin: '32px auto', padding: 24 }}>
      <h1>中国访客地图预览</h1>
      <p>
        模拟数据 ·
        仅供本地预览，不会写入数据库。点击广东、浙江、江苏等省份查看城市，点击“返回全国”返回。
      </p>
      <WorldMap demo />
    </main>
  );
}
