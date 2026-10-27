import React, { useState, useEffect } from 'react';

// Конфигурация Firebase
const firebaseConfig = {
  apiKey: "AIzaSyD6wwP7nh0sq_7xe3d8Zv62R_KrwJtghH0",
  authDomain: "luxe-renovation-72e1a.firebaseapp.com",
  projectId: "luxe-renovation-72e1a",
  storageBucket: "luxe-renovation-72e1a.firebasestorage.app",
  messagingSenderId: "768348735399",
  appId: "1:768348735399:web:e42045b5232caa5189d882"
};

if (!window.firebase.apps.length) {
  window.firebase.initializeApp(firebaseConfig);
}
const db = window.firebase.firestore();

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('luxe_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isRegister, setIsRegister] = useState(false);

  const [shiftStatus, setShiftStatus] = useState(() => localStorage.getItem('luxe_shift_status') || 'off');
  const [startTime, setStartTime] = useState(() => Number(localStorage.getItem('luxe_start_time')) || null);
  const [pausedSeconds, setPausedSeconds] = useState(() => Number(localStorage.getItem('luxe_paused_sec')) || 0);
  const [timer, setTimer] = useState(0);

  const [now, setNow] = useState(Date.now());

  const [materials, setMaterials] = useState([]);
  const [issues, setIssues] = useState([]);
  const [emergencies, setEmergencies] = useState([]);
  const [activeEmployees, setActiveEmployees] = useState([]);
  const [shiftHistory, setShiftHistory] = useState([]);
  const [employeesList, setEmployeesList] = useState([]);
  const [penalties, setPenalties] = useState([]);
  const [projectStages, setProjectStages] = useState([]);

  // Управление интерфейсом
  const [penaltyOpenEmail, setPenaltyOpenEmail] = useState(null);
  const [penaltyHoursInput, setPenaltyHoursInput] = useState({});
  const [penaltyReasonInput, setPenaltyReasonInput] = useState({});

  const [matName, setMatName] = useState('');
  const [matQty, setMatQty] = useState('');
  const [issueText, setIssueText] = useState('');
  const [emText, setEmText] = useState('');
  const [stageName, setStageName] = useState('');

  const companyEmail = 'luxerenovationrealestate@gmail.com';

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const unsubMaterials = db.collection('materials').onSnapshot((snapshot) => {
      setMaterials(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubIssues = db.collection('issues').onSnapshot((snapshot) => {
      setIssues(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubEmergencies = db.collection('emergencies').onSnapshot((snapshot) => {
      setEmergencies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubShifts = db.collection('shifts').onSnapshot((snapshot) => {
      setActiveEmployees(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubHistory = db.collection('shift_history').orderBy('timestamp', 'desc').onSnapshot((snapshot) => {
      setShiftHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubEmployees = db.collection('employees').onSnapshot((snapshot) => {
      setEmployeesList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubPenalties = db.collection('penalties').onSnapshot((snapshot) => {
      setPenalties(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubStages = db.collection('project_stages').onSnapshot((snapshot) => {
      setProjectStages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubMaterials();
      unsubIssues();
      unsubEmergencies();
      unsubShifts();
      unsubHistory();
      unsubEmployees();
      unsubPenalties();
      unsubStages();
    };
  }, []);

  const updateGeoLocation = async (currentSeconds, currentStatus, activeStartTime, activePausedSec) => {
    if (navigator.geolocation && user && user.email !== companyEmail) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          let fullAddr = 'Определяется адрес...';
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
              headers: { 'Accept-Language': 'ru' }
            });
            const data = await res.json();
            if (data && data.address) {
              const addr = data.address;
              const road = addr.road || addr.pedestrian || addr.suburb || '';
              const house = addr.house_number ? `д. ${addr.house_number}` : '';
              const postcode = addr.postcode || '';
              const city = addr.city || addr.town || addr.municipality || addr.county || '';
              
              fullAddr = [road, house, postcode, city].filter(Boolean).join(', ') || data.display_name;
            }
          } catch (e) {
            console.log('Geocoding error:', e);
          }

          await db.collection('shifts').doc(user.email.replace(/[@.]/g, '_')).set({
            name: user.name,
            email: user.email,
            status: currentStatus,
            startTime: activeStartTime,
            pausedSeconds: activePausedSec,
            timer: currentSeconds,
            lat: lat,
            lng: lng,
            address: fullAddr,
            updatedAt: Date.now()
          }, { merge: true });
        },
        async () => {
          await db.collection('shifts').doc(user.email.replace(/[@.]/g, '_')).set({
            name: user.name,
            email: user.email,
            status: currentStatus,
            startTime: activeStartTime,
            pausedSeconds: activePausedSec,
            timer: currentSeconds,
            address: 'Геолокация отключена',
            updatedAt: Date.now()
          }, { merge: true });
        },
        { enableHighAccuracy: true }
      );
    }
  };

  useEffect(() => {
    if (shiftStatus === 'working' && startTime) {
      const currentSeconds = pausedSeconds + Math.floor((now - startTime) / 1000);
      setTimer(currentSeconds);
      
      if (now % 15000 < 1000) {
        updateGeoLocation(currentSeconds, 'Работает', startTime, pausedSeconds);
      }
    }
  }, [now, shiftStatus, startTime, pausedSeconds, user]);

  useEffect(() => {
    localStorage.setItem('luxe_user', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    localStorage.setItem('luxe_shift_status', shiftStatus);
    if (startTime) localStorage.setItem('luxe_start_time', startTime);
    else localStorage.removeItem('luxe_start_time');
    localStorage.setItem('luxe_paused_sec', pausedSeconds);
  }, [shiftStatus, startTime, pausedSeconds]);

  const formatTime = (sec) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    if (!email || !password) return alert('Заполните данные!');
    
    const isOwner = email.toLowerCase().trim() === companyEmail.toLowerCase();
    const role = isOwner ? 'owner' : 'employee';
    const userName = name || email.split('@')[0];
    
    const loggedUser = { email, name: userName, role };
    setUser(loggedUser);

    if (role === 'employee') {
      await db.collection('employees').doc(email.replace(/[@.]/g, '_')).set({
        name: userName,
        email: email,
        role: 'employee',
        lastLogin: Date.now()
      }, { merge: true });
    }
  };

  const changeShift = async (status) => {
    const currentTime = Date.now();
    let newStartTime = startTime;
    let newPausedSeconds = pausedSeconds;
    let finalTimer = timer;
    let statusText = 'Работает';

    if (status === 'working') {
      if (shiftStatus !== 'working' || !startTime) {
        newStartTime = currentTime;
        setStartTime(newStartTime);
      }
      statusText = 'Работает';
    } else if (status === 'break') {
      if (shiftStatus === 'working' && startTime) {
        newPausedSeconds = pausedSeconds + Math.floor((currentTime - startTime) / 1000);
        setPausedSeconds(newPausedSeconds);
        newStartTime = null;
        setStartTime(null);
        finalTimer = newPausedSeconds;
      }
      statusText = 'Обед';
    } else if (status === 'off') {
      let currentShiftAddress = 'Адрес не указан';
      if (user && user.email !== companyEmail) {
        const empDocId = user.email.replace(/[@.]/g, '_');
        const activeEmpData = activeEmployees.find(e => e.id === empDocId);
        if (activeEmpData && activeEmpData.address) {
          currentShiftAddress = activeEmpData.address;
        }
      }

      if (timer > 0 && user && user.email !== companyEmail) {
        await db.collection('shift_history').add({
          name: user.name,
          email: user.email,
          totalTime: timer,
          address: currentShiftAddress,
          date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString(),
          timestamp: currentTime
        });
      }

      newPausedSeconds = 0;
      newStartTime = null;
      finalTimer = 0;
      setPausedSeconds(0);
      setStartTime(null);
      setTimer(0);
      localStorage.removeItem('luxe_start_time');
      localStorage.removeItem('luxe_paused_sec');

      if (user && user.email !== companyEmail) {
        await db.collection('shifts').doc(user.email.replace(/[@.]/g, '_')).delete();
      }
    }

    setShiftStatus(status);

    if (status !== 'off' && user && user.email !== companyEmail) {
      await updateGeoLocation(finalTimer, statusText, newStartTime, newPausedSeconds);
    }
  };

  const forceCloseEmployeeShift = async (emp) => {
    if (!confirm(`Принудительно закрыть смену для ${emp.name}?`)) return;
    try {
      await db.collection('shift_history').add({
        name: emp.name,
        email: emp.email,
        totalTime: emp.timer || 0,
        address: emp.address || 'Адрес не указан',
        date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString() + ' (Админ)',
        timestamp: Date.now()
      });
      await db.collection('shifts').doc(emp.id).delete();
    } catch (error) {
      console.error(error);
    }
  };

  const applyPenalty = async (empEmail, empName) => {
    const hours = parseFloat(penaltyHoursInput[empEmail]);
    const reason = penaltyReasonInput[empEmail] || 'Нарушение регламента';

    if (!hours || isNaN(hours) || hours <= 0) {
      alert('Укажите корректное количество часов');
      return;
    }

    const penaltyId = `${empEmail.replace(/[@.]/g, '_')}_${Date.now()}`;
    try {
      await db.collection('penalties').doc(penaltyId).set({
        id: penaltyId,
        email: empEmail,
        name: empName,
        hours,
        reason,
        date: new Date().toLocaleDateString(),
        timestamp: Date.now()
      });
      setPenaltyHoursInput({ ...penaltyHoursInput, [empEmail]: '' });
      setPenaltyReasonInput({ ...penaltyReasonInput, [empEmail]: '' });
      setPenaltyOpenEmail(null);
    } catch (e) {
      console.error(e);
    }
  };

  const addMaterial = async (e) => {
    e.preventDefault();
    if (!matName) return;
    await db.collection('materials').add({
      user: user.name,
      name: matName,
      qty: matQty,
      status: 'В обработке',
      timestamp: Date.now()
    });
    setMatName('');
    setMatQty('');
  };

  const addIssue = async (e) => {
    e.preventDefault();
    if (!issueText) return;
    await db.collection('issues').add({
      user: user.name,
      text: issueText,
      status: 'Открыто',
      timestamp: Date.now()
    });
    setIssueText('');
  };

  const addEmergency = async (e) => {
    e.preventDefault();
    if (!emText) return;
    await db.collection('emergencies').add({
      user: user.name,
      text: emText,
      time: new Date().toLocaleTimeString(),
      timestamp: Date.now()
    });
    setEmText('');
  };

  const addStage = async (e) => {
    e.preventDefault();
    if (!stageName) return;
    await db.collection('project_stages').add({
      name: stageName,
      status: 'В работе',
      timestamp: Date.now()
    });
    setStageName('');
  };

  const deleteItem = async (col, id) => {
    if (confirm('Подтверждаете удаление?')) {
      await db.collection(col).doc(id).delete();
    }
  };

  const updateMaterialStatus = async (id, status) => {
    await db.collection('materials').doc(id).update({ status });
  };

  const updateIssueStatus = async (id, status) => {
    await db.collection('issues').doc(id).update({ status });
  };

  const updateStageStatus = async (id, status) => {
    await db.collection('project_stages').doc(id).update({ status });
  };

  const getEmployeeLiveTimer = (emp) => {
    if (emp.status === 'Работает' && emp.startTime) {
      const paused = emp.pausedSeconds || 0;
      return paused + Math.floor((now - emp.startTime) / 1000);
    }
    return emp.timer || 0;
  };

  // ЭКРАН ВХОДА И РЕГИСТРАЦИИ
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans text-slate-100 relative overflow-hidden">
        {/* Премиальный подложечный градиент */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-slate-950 to-slate-950 pointer-events-none"></div>

        <div className="relative w-full max-w-sm bg-slate-900/90 backdrop-blur-2xl border border-amber-500/20 p-8 rounded-3xl shadow-2xl shadow-black/80">
          <div className="text-center mb-8">
            <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 items-center justify-center text-slate-950 font-black text-lg mb-3 shadow-lg shadow-amber-500/20">
              LR
            </div>
            <h1 className="text-lg font-black tracking-widest text-slate-100 uppercase">LUXE RENOVATION</h1>
            <div className="h-0.5 w-12 bg-amber-500/50 mx-auto my-2 rounded-full"></div>
            <p className="text-[11px] text-slate-400 font-medium tracking-wide">Copenhagen • Renovation Management</p>
          </div>

          <div className="flex bg-slate-950/80 p-1 rounded-2xl mb-6 border border-slate-800 text-xs font-semibold">
            <button type="button" className={`flex-1 py-2.5 rounded-xl transition-all duration-200 ${!isRegister ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20' : 'text-slate-400 hover:text-white'}`} onClick={() => setIsRegister(false)}>Вход</button>
            <button type="button" className={`flex-1 py-2.5 rounded-xl transition-all duration-200 ${isRegister ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20' : 'text-slate-400 hover:text-white'}`} onClick={() => setIsRegister(true)}>Регистрация</button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4 text-xs">
            {isRegister && (
              <div>
                <label className="block text-slate-400 mb-1.5 font-medium">Имя и Фамилия</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-amber-500/80 outline-none transition" placeholder="Станислав" required />
              </div>
            )}
            <div>
              <label className="block text-slate-400 mb-1.5 font-medium">Электронная почта</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-amber-500/80 outline-none transition" placeholder="name@domain.com" required />
            </div>
            <div>
              <label className="block text-slate-400 mb-1.5 font-medium">Пароль</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-amber-500/80 outline-none transition" placeholder="••••••••" required />
            </div>

            <button type="submit" className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black py-3.5 rounded-xl transition-all shadow-xl shadow-amber-500/20 uppercase tracking-wider text-[11px] mt-2">
              {isRegister ? 'Создать аккаунт' : 'Войти в панель'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const isOwner = user.email.toLowerCase() === companyEmail.toLowerCase();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased pb-12">
      {/* Шапка элитного уровня */}
      <header className="bg-slate-900/90 backdrop-blur-xl border-b border-amber-500/20 px-5 py-3.5 sticky top-0 z-50 flex justify-between items-center shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20">LR</div>
          <div>
            <h1 className="font-black text-xs text-slate-100 tracking-widest uppercase">LUXE RENOVATION</h1>
            <p className="text-[10px] text-amber-400/90 font-medium">{user.name} • <span className="text-slate-400">{isOwner ? 'Руководитель' : 'Специалист'}</span></p>
          </div>
        </div>
        <button onClick={() => setUser(null)} className="text-[11px] bg-slate-800/80 hover:bg-slate-700 text-slate-300 px-3.5 py-1.5 rounded-xl border border-slate-700/60 transition font-medium">Выйти</button>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-4">
        {!isOwner ? (
          <>
            {/* ТАЙМЕР СОТРУДНИКА */}
            <div className="bg-slate-900/90 border border-amber-500/20 p-6 rounded-3xl text-center shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-0.5 bg-amber-500"></div>
              <div className="text-[10px] text-slate-400 uppercase tracking-widest mb-2 font-bold">Отработанное время</div>
              <div className="text-5xl font-mono font-black mb-6 text-amber-400 tracking-tight drop-shadow-[0_0_20px_rgba(245,158,11,0.25)]">{formatTime(timer)}</div>
              <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
                <button onClick={() => changeShift('working')} className={`py-3 rounded-xl text-xs font-bold transition-all ${shiftStatus === 'working' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}>Старт</button>
                <button onClick={() => changeShift('break')} className={`py-3 rounded-xl text-xs font-bold transition-all ${shiftStatus === 'break' ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}>Обед</button>
                <button onClick={() => changeShift('off')} className="py-3 bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white rounded-xl text-xs font-bold transition border border-rose-500/20">Финиш</button>
              </div>
            </div>

            {shiftStatus !== 'off' && (
              <div className="grid md:grid-cols-2 gap-3">
                <div className="bg-slate-900/90 border border-slate-800/80 p-4 rounded-3xl shadow-xl">
                  <h3 className="text-xs font-bold mb-3 text-amber-400 uppercase tracking-wider">📦 Заказ материалов</h3>
                  <form onSubmit={addMaterial} className="space-y-2.5 text-xs">
                    <input type="text" placeholder="Наименование..." value={matName} onChange={e => setMatName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-none focus:border-amber-500" />
                    <input type="text" placeholder="Количество..." value={matQty} onChange={e => setMatQty(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-none focus:border-amber-500" />
                    <button type="submit" className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 py-2 rounded-xl font-bold transition">Заказать</button>
                  </form>
                </div>

                <div className="bg-slate-900/90 border border-slate-800/80 p-4 rounded-3xl shadow-xl">
                  <h3 className="text-xs font-bold mb-3 text-amber-400 uppercase tracking-wider">💬 Обращение к владельцу</h3>
                  <form onSubmit={addIssue} className="space-y-2.5 text-xs">
                    <textarea placeholder="Опишите вопрос по объекту..." value={issueText} onChange={e => setIssueText(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white h-[80px] outline-none focus:border-amber-500 resize-none"></textarea>
                    <button type="submit" className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 py-2 rounded-xl font-bold transition">Отправить</button>
                  </form>
                </div>

                <div className="bg-slate-900/90 border border-rose-500/30 p-4 rounded-3xl shadow-xl md:col-span-2">
                  <h3 className="text-xs font-bold mb-2 text-rose-400 uppercase tracking-wider">🚨 ЧП / Экстренная ситуация</h3>
                  <form onSubmit={addEmergency} className="flex gap-2 text-xs">
                    <input type="text" placeholder="Срочное сообщение..." value={emText} onChange={e => setEmText(e.target.value)} className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-rose-500" />
                    <button type="submit" className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl font-bold transition">Передать</button>
                  </form>
                </div>
              </div>
            )}
          </>
        ) : (
          /* ПАНЕЛЬ ВЛАДЕЛЬЦА (LUXE ADMIN) */
          <div className="space-y-4">
            {/* Сводка */}
            <div className="bg-slate-900/90 border border-amber-500/20 p-5 rounded-3xl shadow-xl">
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">Мониторинг компании Luxe Renovation</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                  <div className="text-xl font-black text-amber-400">{employeesList.length}</div>
                  <div className="text-[10px] text-slate-400 uppercase font-medium mt-0.5">Сотрудники</div>
                </div>
                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                  <div className="text-xl font-black text-slate-100">{materials.length}</div>
                  <div className="text-[10px] text-slate-400 uppercase font-medium mt-0.5">Материалы</div>
                </div>
                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                  <div className="text-xl font-black text-slate-100">{issues.length}</div>
                  <div className="text-[10px] text-slate-400 uppercase font-medium mt-0.5">Обращения</div>
                </div>
                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                  <div className="text-xl font-black text-rose-500">{emergencies.length}</div>
                  <div className="text-[10px] text-slate-400 uppercase font-medium mt-0.5">ЧП</div>
                </div>
              </div>
            </div>

            {/* Активные смены */}
            <div className="bg-slate-900/90 border border-slate-800/80 p-4.5 rounded-3xl shadow-xl">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-3 flex items-center justify-between">
                <span>⚡ Работают на объектах сейчас</span>
                <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-md text-[10px] font-mono">{activeEmployees.length} онлайн</span>
              </h3>
              {activeEmployees.length === 0 ? <p className="text-xs text-slate-500">Нет активных смен на объектах</p> : (
                <div className="space-y-2">
                  {activeEmployees.map(emp => {
                    const liveSec = getEmployeeLiveTimer(emp);
                    return (
                      <div key={emp.id} className="bg-slate-950 border border-slate-800 p-3 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
                        <div>
                          <span className="font-bold text-slate-100">{emp.name}</span> — <span className="text-amber-400 font-medium">{emp.status}</span>
                          <div className="font-mono text-[11px] text-slate-400 mt-0.5">Время: {formatTime(liveSec)}</div>
                          <div className="text-[11px] text-blue-400 mt-0.5">
                            {emp.lat && emp.lng ? (
                              <a href={`https://www.google.com/maps?q=${emp.lat},${emp.lng}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                📍 {emp.address || 'Адрес объекта'}
                              </a>
                            ) : <span className="text-slate-500">📍 Ожидание геолокации...</span>}
                          </div>
                        </div>
                        <button onClick={() => forceCloseEmployeeShift(emp)} className="bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white px-3 py-1.5 rounded-xl transition text-[11px] font-semibold border border-rose-500/20">Закрыть смену</button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* База сотрудников и компактные штрафы */}
            <div className="bg-slate-900/90 border border-slate-800/80 p-4.5 rounded-3xl shadow-xl">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-3">👥 База сотрудников</h3>
              {employeesList.length === 0 ? <p className="text-xs text-slate-500">В базе пока нет пользователей</p> : (
                <div className="space-y-2">
                  {employeesList.map(emp => {
                    const empPenalties = penalties.filter(p => p.email === emp.email);
                    const isOpen = penaltyOpenEmail === emp.email;
                    return (
                      <div key={emp.id} className="bg-slate-950 border border-slate-800 p-3 rounded-2xl text-xs space-y-2">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-bold text-slate-200">{emp.name}</span>
                            <div className="text-[11px] text-slate-400">{emp.email}</div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => setPenaltyOpenEmail(isOpen ? null : emp.email)} className="bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-slate-950 px-2.5 py-1.5 rounded-xl transition font-semibold border border-amber-500/20 text-[11px]">
                              {isOpen ? 'Скрыть' : 'Штраф'}
                            </button>
                            <button onClick={() => deleteItem('employees', emp.id)} className="bg-slate-900 hover:bg-rose-600 text-slate-400 hover:text-white px-2 py-1.5 rounded-xl transition border border-slate-800 text-[11px]">✕</button>
                          </div>
                        </div>

                        {/* Форма вычета часов */}
                        {isOpen && (
                          <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 space-y-2 mt-2">
                            <div className="flex gap-2">
                              <input 
                                type="number" 
                                step="0.5" 
                                placeholder="Часы (-1)" 
                                value={penaltyHoursInput[emp.email] || ''} 
                                onChange={e => setPenaltyHoursInput({ ...penaltyHoursInput, [emp.email]: e.target.value })}
                                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-white w-24 outline-none focus:border-amber-500"
                              />
                              <input 
                                type="text" 
                                placeholder="Причина..." 
                                value={penaltyReasonInput[emp.email] || ''} 
                                onChange={e => setPenaltyReasonInput({ ...penaltyReasonInput, [emp.email]: e.target.value })}
                                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-white outline-none focus:border-amber-500"
                              />
                              <button onClick={() => applyPenalty(emp.email, emp.name)} className="bg-rose-600 hover:bg-rose-500 text-white px-3 py-1 rounded-lg font-bold">ОК</button>
                            </div>
                          </div>
                        )}

                        {empPenalties.length > 0 && (
                          <div className="pt-1 text-[11px] text-rose-400 space-y-1">
                            {empPenalties.map(p => (
                              <div key={p.id} className="flex justify-between items-center bg-slate-900/60 px-2.5 py-1 rounded-lg">
                                <span>Штраф: -{p.hours} ч. ({p.reason})</span>
                                <button onClick={() => deleteItem('penalties', p.id)} className="text-slate-500 hover:text-white">✕</button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* История отработанного времени */}
            <div className="bg-slate-900/90 border border-slate-800/80 p-4.5 rounded-3xl shadow-xl">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-3">📊 История отработанного времени</h3>
              {shiftHistory.length === 0 ? <p className="text-xs text-slate-500">История смен пуста</p> : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {shiftHistory.map(sh => (
                    <div key={sh.id} className="bg-slate-950 border border-slate-800 p-3 rounded-2xl flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-slate-200">{sh.name}</span>
                        <div className="text-[11px] text-slate-400">{sh.date} • 📍 {sh.address}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-amber-400 font-bold">{formatTime(sh.totalTime)}</span>
                        <button onClick={() => deleteItem('shift_history', sh.id)} className="text-slate-500 hover:text-rose-400">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Заказы материалов и Обращения */}
            <div className="grid md:grid-cols-2 gap-3">
              <div className="bg-slate-900/90 border border-slate-800/80 p-4 rounded-3xl shadow-xl">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-3">📦 Заказы материалов</h3>
                {materials.length === 0 ? <p className="text-xs text-slate-500">Заказов пока нет</p> : (
                  <div className="space-y-2">
                    {materials.map(m => (
                      <div key={m.id} className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-xs space-y-1">
                        <div className="flex justify-between font-medium">
                          <span className="text-slate-200">{m.name} ({m.qty})</span>
                          <button onClick={() => deleteItem('materials', m.id)} className="text-slate-500 hover:text-rose-400">✕</button>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-400">От: {m.user}</span>
                          <select value={m.status} onChange={e => updateMaterialStatus(m.id, e.target.value)} className="bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-amber-400">
                            <option value="В обработке">В обработке</option>
                            <option value="Заказано">Заказано</option>
                            <option value="Доставлено">Доставлено</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-slate-900/90 border border-slate-800/80 p-4 rounded-3xl shadow-xl">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-3">💬 Обращения работников</h3>
                {issues.length === 0 ? <p className="text-xs text-slate-500">Обращений пока нет</p> : (
                  <div className="space-y-2">
                    {issues.map(i => (
                      <div key={i.id} className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-xs space-y-1">
                        <div className="flex justify-between font-medium">
                          <span className="text-slate-200">{i.user}: {i.text}</span>
                          <button onClick={() => deleteItem('issues', i.id)} className="text-slate-500 hover:text-rose-400">✕</button>
                        </div>
                        <div className="flex justify-end">
                          <select value={i.status} onChange={e => updateIssueStatus(i.id, e.target.value)} className="bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-amber-400 text-[11px]">
                            <option value="Открыто">Открыто</option>
                            <option value="В работе">В работе</option>
                            <option value="Решено">Решено</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {emergencies.length > 0 && (
              <div className="bg-rose-950/20 border border-rose-500/30 p-4 rounded-3xl">
                <h3 className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-2">🚨 Экстренные ЧП</h3>
                <div className="space-y-1.5">
                  {emergencies.map(e => (
                    <div key={e.id} className="bg-slate-950 p-2.5 rounded-xl text-xs flex justify-between items-center border border-rose-500/20">
                      <div><span className="font-bold text-rose-400">{e.user}:</span> <span className="text-slate-200">{e.text}</span></div>
                      <button onClick={() => deleteItem('emergencies', e.id)} className="text-slate-500 hover:text-white">✕</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
