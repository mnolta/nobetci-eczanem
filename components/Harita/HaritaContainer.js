import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { mesafeHesapla } from '@/utils/mesafeHesapla';

const MapComponent = dynamic(() => import('./MapComponent'), {
    ssr: false,
    loading: () => <p>Harita yükleniyor...</p>,
    suppressHydrationWarning: true
});
const PanelComponent = dynamic(() => import('./PanelComponent'), { ssr: false });

export default function HaritaContainer({ konum, eczanelerData }) {
    const [tema, setTema] = useState('light');
    const [panelAcik, setPanelAcik] = useState(true);

    const [secilenSehir, setSecilenSehir] = useState('');
    const [secilenIlce, setSecilenIlce] = useState('');

    const seciliEczaneler = eczanelerData?.[secilenSehir]?.[secilenIlce] || [];

    const [yakinEczaneler, setYakinEczaneler] = useState([]);

    useEffect(() => {
        if (konum && eczanelerData && eczanelerData.Ankara) {
            const tumEczaneler = [];

            Object.keys(eczanelerData.Ankara).forEach((ilce) => {
                const eczaneListesi = eczanelerData.Ankara[ilce];

                eczaneListesi.forEach((eczane) => {
                    const mesafe = mesafeHesapla(
                        konum[0],
                        konum[1],
                        eczane.latitude,
                        eczane.longitude
                    );

                    tumEczaneler.push({
                        ...eczane,
                        mesafe,
                        ilce
                    });
                });
            });

            const siraliEczaneler = tumEczaneler.sort((a, b) => a.mesafe - b.mesafe);

            setYakinEczaneler(siraliEczaneler.slice(0, 5)); // En yakın 5 eczane
        }
    }, [konum, eczanelerData]);




    return (
        <div style={{ position: 'relative', height: '100vh', width: '100%' }}>
            <MapComponent
                konum={konum}
                eczaneler={seciliEczaneler}
                tema={tema}
                setTema={setTema}
                yakinEczaneler={yakinEczaneler}
                secilenSehir={secilenSehir}
                secilenIlce={secilenIlce}
            />
            <PanelComponent
                panelAcik={panelAcik}
                setPanelAcik={setPanelAcik}
                eczanelerData={eczanelerData}
                secilenSehir={secilenSehir}
                setSecilenSehir={setSecilenSehir}
                secilenIlce={secilenIlce}
                setSecilenIlce={setSecilenIlce}
                yakinEczaneler={yakinEczaneler}
            />
        </div>
    );
}
