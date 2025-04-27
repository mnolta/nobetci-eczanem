import dynamic from 'next/dynamic';
const HaritaContainer = dynamic(() => import('@/components/Harita/HaritaContainer'), { ssr: false });
import { useState,useEffect } from 'react';

export default function Home() {
  const [konum, setKonum] = useState([39.9208, 32.8541]); // Örnek konum: Ankara
  const [eczanelerData, setEczanelerData] = useState([]);

  useEffect(() => {
    fetch('/eczaneler.json')
      .then(res => res.json())
      .then(data => setEczanelerData(data));
  }, []);

  return (
    <div>
      <HaritaContainer konum={konum} eczanelerData={eczanelerData} />
    </div>
  );
}
