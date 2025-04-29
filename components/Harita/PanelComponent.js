import { useState, useEffect } from 'react';

export default function PanelComponent({
    panelAcik,
    setPanelAcik,
    eczanelerData,
    secilenSehir,
    setSecilenSehir,
    secilenIlce,
    setSecilenIlce,
    yakinEczaneler
}) {
    const [touchStartY, setTouchStartY] = useState(null);
    const [touchEndY, setTouchEndY] = useState(null);

    const [ilceListesi, setIlceListesi] = useState([]);
    const [eczaneler, setEczaneler] = useState([]);

    const [panelHeight, setPanelHeight] = useState('40vh');


    const handleTouchStart = (e) => {
        setTouchStartY(e.touches[0].clientY);
    };

    const handleTouchMove = (e) => {
        if (touchStartY === null) return;

        const currentY = e.touches[0].clientY;
        const deltaY = currentY - touchStartY;

        const currentHeight = parseFloat(panelHeight); // vh olarak
        const vhDelta = (deltaY / window.innerHeight) * 100;

        let newHeight = currentHeight - vhDelta;

        newHeight = Math.max(40, Math.min(newHeight, 90));

        setPanelHeight(`${newHeight}vh`);
        setTouchStartY(currentY); // hareket akıcı devam etsin diye güncelliyoruz
    };





    const handleTouchEnd = () => {
        const numericHeight = parseFloat(panelHeight);

        // Panel yüksekliği 65'ten azsa → 40'a indir (yarı açık)
        // Değilse → tam açık 90 yap
        if (numericHeight <= 65) {
            setPanelHeight('40vh');
        } else {
            setPanelHeight('90vh');
        }

        setPanelAcik(true); // panel açık sayılmaya devam etsin
        setTouchStartY(null);
    };




    useEffect(() => {
        if (secilenSehir) {
            setIlceListesi(Object.keys(eczanelerData[secilenSehir] || {}));
            setSecilenIlce('');
            setEczaneler([]);
        }
    }, [secilenSehir]);

    useEffect(() => {
        if (secilenSehir && secilenIlce) {
            setEczaneler(eczanelerData[secilenSehir][secilenIlce] || []);
        }
    }, [secilenIlce]);

    return (
        <>
            <div
                style={{
                    position: 'absolute',
                    bottom: panelAcik ? '0' : '-50px',
                    width: '100%',
                    height: panelHeight,
                    transition: 'bottom 0.4s ease',
                    zIndex: 999,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    background: 'rgba(255,255,255,0.95)',
                    borderTopLeftRadius: '20px',
                    borderTopRightRadius: '20px',
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {/* Gri Çubuk */}
                <div
                    onClick={() => {
                        const numericHeight = parseFloat(panelHeight);
                        if (numericHeight <= 60) {
                            setPanelHeight('90vh');
                        } else {
                            setPanelHeight('40vh');
                        }
                        setPanelAcik(true);
                    }}
                    style={{
                        width: '60px',
                        height: '6px',
                        background: '#ccc',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                        alignSelf: 'center',
                        marginTop: '10px',
                        marginBottom: '20px',
                        flexShrink: 0,
                    }}
                />

                {/* Scrollable İçerik */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '0 20px 20px 20px'
                }}>


                    {/* Şehir Dropdown */}
                    {eczanelerData && typeof eczanelerData === 'object' && (
                        <select
                            value={secilenSehir}
                            onChange={(e) => setSecilenSehir(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '12px',
                                marginBottom: '12px',
                                border: '1px solid #ddd',
                                borderRadius: '8px',
                                background: '#f9f9f9',
                                fontSize: '16px',
                                color: '#333'
                            }}
                        >
                            <option value="">Şehir Seçin</option>
                            {Object.keys(eczanelerData).map((sehir, index) => (
                                <option key={index} value={sehir}>{sehir}</option>
                            ))}
                        </select>
                    )}

                    {/* İlçe Dropdown */}
                    {secilenSehir && ilceListesi.length > 0 && (
                        <select
                            value={secilenIlce}
                            onChange={(e) => setSecilenIlce(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '12px',
                                marginBottom: '12px',
                                border: '1px solid #ddd',
                                borderRadius: '8px',
                                background: '#f9f9f9',
                                fontSize: '16px',
                                color: '#333'
                            }}
                        >
                            <option value="">İlçe Seçin</option>
                            {ilceListesi.map((ilce, index) => (
                                <option key={index} value={ilce}>{ilce}</option>
                            ))}
                        </select>
                    )}

                    {/* En yakın 5 Eczane Listesi */}
                    {(!secilenSehir || !secilenIlce) && yakinEczaneler.length > 0 && (
                        <div style={{ marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px' }}>
                                Konumunuza göre Size En Yakın Eczaneler
                            </h3>
                            {yakinEczaneler.map((eczane, index) => (
                                <div key={index} style={{
                                    background: '#fff',
                                    borderRadius: '10px',
                                    padding: '10px',
                                    marginBottom: '10px',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                                }}>
                                    <strong style={{ fontSize: '16px', color: '#333' }}>{eczane.isim}</strong><br />
                                    <span style={{ fontSize: '14px', color: '#666' }}>{eczane.adres}</span><br />
                                    <span style={{ fontSize: '12px', color: '#888' }}>{eczane.mesafe.toFixed(2)} km yakınınızda</span><br />
                                    <a href={`https://www.google.com/maps/dir/?api=1&destination=${eczane.latitude},${eczane.longitude}`} target="_blank" rel="noopener noreferrer" style={{ color: '#0070f3', textDecoration: 'underline', fontSize: '14px' }}>
                                        Yol Tarifi Al
                                    </a>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Eczane Listesi */}
                    {Array.isArray(eczaneler) && eczaneler.map((eczane, index) => (
                        <div key={index} style={{
                            marginBottom: '15px', background: '#fff',
                            borderRadius: '10px',
                            padding: '10px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                        }}>
                            <strong style={{ fontSize: '16px', color: '#333' }}>{eczane.isim}</strong><br />
                            <span style={{ fontSize: '14px', color: '#666' }}>{eczane.adres}</span><br />
                            <a href={`https://www.google.com/maps/dir/?api=1&destination=${eczane.latitude},${eczane.longitude}`} target="_blank" rel="noopener noreferrer">
                                Yol Tarifi Al
                            </a>
                        </div>
                    ))}

                </div>

            </div>
        </>
    );
}
