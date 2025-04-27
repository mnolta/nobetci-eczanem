import { useState } from 'react';
import dynamic from 'next/dynamic';

const MapComponent = dynamic(() => import('./MapComponent'), { ssr: false });
const PanelComponent = dynamic(() => import('./PanelComponent'), { ssr: false });

export default function HaritaContainer({ konum, eczanelerData }) {
    const [tema, setTema] = useState('light');
    const [panelAcik, setPanelAcik] = useState(true);

    return (
        <div style={{ position: 'relative', height: '100vh', width: '100%' }}>
            <MapComponent
                konum={konum}
                eczaneler={eczanelerData}
                tema={tema}
                setTema={setTema}
            />
            <PanelComponent
                panelAcik={panelAcik}
                setPanelAcik={setPanelAcik}
                eczanelerData={eczanelerData}
            />
        </div>
    );
}
