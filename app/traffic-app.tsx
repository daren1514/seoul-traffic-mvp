"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Clock3, Play, Pause, RotateCcw, MapPin, AlertTriangle, CalendarDays, Radio } from "lucide-react";

const TrafficMap = dynamic(() => import("./traffic-map"), { ssr: false });

type Incident = {
  id: string; title: string; road: string; type: string; status: string;
  start: string; end: string; lat: number; lng: number; detail: string;
  source: string; demo?: boolean;
};

const fmt = (date: Date) => date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });
const toLocalInput = (d: Date) => {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

export default function TrafficApp() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [mode, setMode] = useState("demo");
  const [selected, setSelected] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [selectedTime, setSelectedTime] = useState(() => {
    const d = new Date(); d.setMinutes(Math.floor(d.getMinutes() / 15) * 15, 0, 0); return d;
  });
  const [dateValue, setDateValue] = useState(() => toLocalInput(new Date()).slice(0, 10));

  useEffect(() => {
    fetch("/api/incidents").then(r => r.json()).then(data => {
      setIncidents(data.incidents ?? []); setMode(data.mode ?? "unknown");
    }).catch(() => setMode("error"));
  }, []);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => setSelectedTime(t => new Date(t.getTime() + 15 * 60000)), 900);
    return () => window.clearInterval(id);
  }, [playing]);

  const visible = useMemo(() => incidents.filter(item => {
    const t = selectedTime.getTime();
    return t >= new Date(item.start).getTime() && t <= new Date(item.end).getTime();
  }), [incidents, selectedTime]);

  const selectedIncident = incidents.find(i => i.id === selected) ?? null;
  const min = new Date(`${dateValue}T00:00:00`);
  const max = new Date(`${dateValue}T23:45:00`);
  const sliderValue = Math.max(0, Math.min(95, Math.round((selectedTime.getTime() - min.getTime()) / 900000)));

  function changeSlider(value: number) {
    const d = new Date(`${dateValue}T00:00:00`);
    d.setMinutes(value * 15);
    setSelectedTime(d);
  }
  function changeDate(value: string) {
    setDateValue(value);
    setSelectedTime(new Date(`${value}T09:00:00`));
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand"><div className="brand-mark"><Radio size={19}/></div><div><div className="brand-name">SEOUL TRAFFIC</div><div className="brand-sub">CONTROL TIMELINE</div></div></div>
        <div className="top-actions"><span className="live-dot"/><span>MAP VIEW</span><span className="top-divider"/> <span className="top-date">{new Date().toLocaleDateString("ko-KR", {year:"numeric", month:"2-digit", day:"2-digit"})}</span></div>
      </header>

      <section className="intro">
        <div><div className="eyebrow">SEOUL · ROAD EVENT MONITOR</div><h1>서울 교통통제 타임라인</h1><p>시간을 이동하며 서울의 도로 통제 현황을 확인하세요.</p></div>
        <div className="demo-pill"><span/> {mode === "demo" ? "DEMO DATA" : mode.toUpperCase()}</div>
      </section>

      <section className="workspace">
        <div className="map-wrap">
          <TrafficMap incidents={visible} selected={selected} onSelect={setSelected}/>
          <div className="map-legend">
            <span><i className="legend-dot active"/>통제 중</span>
            <span><i className="legend-dot planned"/>통제 예정</span>
          </div>
          <div className="map-attribution">Map data © OpenStreetMap contributors</div>
        </div>

        <aside className="side-panel">
          <div className="panel-heading"><div><div className="eyebrow">SELECTED TIME</div><h2>{fmt(selectedTime)}</h2></div><Clock3 size={21}/></div>
          <div className="date-control"><CalendarDays size={16}/><input aria-label="날짜 선택" type="date" value={dateValue} onChange={e => changeDate(e.target.value)}/></div>
          <div className="stat-row"><div><strong>{visible.length}</strong><span>표시 중인 통제</span></div><div><strong>{incidents.length}</strong><span>전체 등록 정보</span></div></div>
          <div className="list-title"><span>통제 정보</span><span>{visible.length} EVENTS</span></div>
          <div className="incident-list">
            {visible.length === 0 ? <div className="empty"><MapPin size={24}/><b>해당 시간에 표시할 정보가 없습니다.</b><span>시간을 이동해 다른 통제정보를 확인해 보세요.</span></div> :
              visible.map(item => <button className={`incident ${selected === item.id ? "chosen" : ""}`} key={item.id} onClick={() => setSelected(item.id)}>
                <div className={`incident-icon ${item.status === "통제 예정" ? "planned" : ""}`}><AlertTriangle size={17}/></div>
                <div className="incident-copy"><b>{item.road}</b><span>{item.title}</span><small>{item.start.slice(11,16)} – {item.end.slice(11,16)} · {item.status}</small></div>
              </button>)}
          </div>
          <div className="panel-foot">데모 정보는 실제 교통통제 상황이 아닙니다.</div>
        </aside>
      </section>

      {selectedIncident && <section className="detail-bar"><div><span className="eyebrow">EVENT DETAIL</span><b>{selectedIncident.title}</b><span>{selectedIncident.detail}</span></div><button onClick={() => setSelected(null)}>닫기</button></section>}

      <section className="timeline">
        <div className="timeline-head"><div><span className="eyebrow">TIME MACHINE</span><h3>{dateValue.replaceAll("-", ".")} <span>{fmt(selectedTime)}</span></h3></div><button className="now-btn" onClick={() => { const n = new Date(); setDateValue(toLocalInput(n).slice(0,10)); setSelectedTime(n); setPlaying(false); }}><RotateCcw size={14}/> 현재 시각</button></div>
        <div className="range-wrap"><input aria-label="시간 이동" type="range" min="0" max="95" step="1" value={sliderValue} onChange={e => changeSlider(Number(e.target.value))}/><div className="range-labels"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:45</span></div></div>
        <div className="timeline-bottom"><div className="timeline-hint">드래그하여 15분 단위로 시간 이동</div><button className="play-btn" onClick={() => setPlaying(!playing)}>{playing ? <Pause size={15}/> : <Play size={15}/>} {playing ? "일시정지" : "시간 재생"}</button></div>
      </section>
      <footer><span>SEOUL TRAFFIC TIMELINE</span><span>Portfolio MVP · Public data visualization concept</span></footer>
    </main>
  );
}
