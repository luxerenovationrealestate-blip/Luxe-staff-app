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

  // Состояния для компактных штрафов
  const [penaltyOpenEmail, setPenaltyOpenEmail] = useState(null);
  const [penaltyHoursInput, setPenaltyHoursInput] = useState({});
  const [penaltyReasonInput, setPenaltyReasonInput] = useState({});

  const [matName, setMatName] = useState('');
  const [matQty, setMatQty] = useState('');
  const [issueText, setIssueText] = useState('');
  const [emText, setEmText] = useState('');

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

    return () => {
      unsubMaterials();
      unsubIssues();
      unsubEmergencies();
      unsubShifts();
      unsubHistory();
      unsubEmployees();
      unsubPenalties();
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
    
    // Автоматическое определение роли: главный email — владелец, все остальные — сотрудники без выбора
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
    if (!confirm(`Закрыть смену для ${emp.name}?`)) return;
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
      alert('Укажите корректные часы для штрафа');
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

  const deleteItem = async (col, id) => {
    if (confirm('Удалить эту запись?')) {
      await db.collection(col).doc(id).delete();
    }
  };

  const updateMaterialStatus = async (id, status) => {
    await db.collection('materials').doc(id).update({ status });
  };

  const updateIssueStatus = async (id, status) => {
    await db.collection('issues').doc(id).update({ status });
  };

  const getEmployeeLiveTimer = (emp) => {
    if (emp.status === 'Работает' && emp.startTime) {
      const paused = emp.pausedSeconds || 0;
      return paused + Math.floor((now - emp.startTime) / 1000);
    }
    return emp.timer || 0;
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4 bg-slate-950">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-sm w-full shadow-2xl text-slate-100">
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold tracking-wider text-amber-500 uppercase">Luxe Renovation</h1>
            <p className="text-slate-400 text-xs mt-1">Система управления строительными объектами</p>
          </div>

          <div className="flex bg-slate-950 p-1 rounded-xl mb-6 border border-slate-800 text-xs font-medium">
            <button type="button" className={`flex-1 py-2 rounded-lg transition ${!isRegister ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400'}`} onClick={() => setIsRegister(false)}>Вход</button>
            <button type="button" className={`flex-1 py-2 rounded-lg transition ${isRegister ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400'}`} onClick={() => setIsRegister(true)}>Регистрация</button>
          </div>

          <form onSubmit={handleAuth} className="space-y-3.5 text-xs">
            {isRegister && (
              <div>
                <label className="block text-slate-400 mb-1">Имя / Фамилия</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-amber-500 outline-none" placeholder="Иван" required />
              </div>
            )}
            <div>
              <label className="block text-slate-400 mb-1">Электронная почта</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-amber-500 outline-none" placeholder="name@example.com" required />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Пароль</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-amber-500 outline-none" placeholder="••••••••" required />
            </div>

            <button type="submit" className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 rounded-xl transition mt-2 shadow-lg shadow-amber-500/10">
              {isRegister ? 'Создать аккаунт' : 'Войти в систему'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const isOwner = user.email.toLowerCase() === companyEmail.toLowerCase();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased">
      {/* Премиум шапка */}
      <header className="bg-slate-900/80 backdrop-blur border-b border-slate-800 px-4 py-3 sticky top-0 z-50 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 font-bold text-sm">LR</div>
          <div>
            <h1 className="font-bold text-sm text-slate-100 tracking-wide">Luxe Renovation</h1>
            <p className="text-[11px] text-slate-400">{user.name} ({isOwner ? 'Владелец' : 'Сотрудник'})</p>
          </div>
        </div>
        <button onClick={() => setUser(null)} className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700 transition">Выйти</button>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-4">
        {!isOwner ? (
          <>
            {/* Карточка таймера сотрудника */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl text-center shadow-xl">
              <div className="text-xs text-slate-400 uppercase tracking-widest mb-1 font-medium">Отработано времени</div>
              <div className="text-4xl font-mono font-bold mb-6 text-amber-500 tracking-tight">{formatTime(timer)}</div>
              <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
                <button onClick={() => changeShift('working')} className={`py-2.5 rounded-xl text-xs font-semibold transition ${shiftStatus === 'working' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}>Старт</button>
                <button onClick={() => changeShift('break')} className={`py-2.5 rounded-xl text-xs font-semibold transition ${shiftStatus === 'break' ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}>Обед</button>
                <button onClick={() => changeShift('off')} className="py-2.5 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white rounded-xl text-xs font-semibold transition border border-rose-500/30">Финиш</button>
              </div>
            </div>

            {shiftStatus !== 'off' && (
              <div className="grid md:grid-cols-2 gap-3">
                <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
                  <h3 className="text-xs font-semibold mb-2.5 text-amber-500 uppercase tracking-wider">📦 Заказ материалов</h3>
                  <form onSubmit={addMaterial} className="space-y-2.5 text-xs">
                    <input type="text" placeholder="Материал (напр. Шпаклевка 25кг)" value={matName} onChange={e => setMatName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-none focus:border-amber-500" />
                    <input type="text" placeholder="Количество (напр. 5 мешков)" value={matQty} onChange={e => setMatQty(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-none focus:border-amber-500" />
                    <button type="submit" className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 py-2 rounded-xl font-bold transition">Заказать</button>
                  </form>
                </div>

                <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
                  <h3 className="text-xs font-semibold mb-2.5 text-amber-500 uppercase tracking-wider">💬 Обращение к руководству</h3>
                  <form onSubmit={addIssue} className="space-y-2.5 text-xs">
                    <textarea placeholder="Опишите вопрос по объекту..." value={issueText} onChange={e => setIssueText(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white h-[82px] outline-none focus:border-amber-500 resize-none"></textarea>
                    <button type="submit" className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 py-2 rounded-xl font-bold transition">Отправить</button>
                  </form>
                </div>

                <div className="bg-slate-900 p-4 rounded-2xl border border-rose-500/20 md:col-span-2">
                  <h3 className="text-xs font-semibold mb-2 text-rose-400 uppercase tracking-wider">🚨 Экстренный Форс-мажор</h3>
                  <form onSubmit={addEmergency} className="flex gap-2 text-xs">
                    <input type="text" placeholder="Срочное сообщение о ЧП..." value={emText} onChange={e => setEmText(e.target.value)} className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-rose-500" />
                    <button type="submit" className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl font-semibold transition">Сообщить</button>
                  </form>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4">
            {/* Компактная статистика владения */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Сводка компании</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="text-lg font-bold text-amber-500">{employeesList.length}</div>
                  <div className="text-[10px] text-slate-400 uppercase">Сотрудники</div>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="text-lg font-bold text-slate-100">{materials.length}</div>
                  <div className="text-[10px] text-slate-400 uppercase">Материалы</div>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="text-lg font-bold text-slate-100">{issues.length}</div>
                  <div className="text-[10px] text-slate-400 uppercase">Обращения</div>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="text-lg font-bold text-rose-500">{emergencies.length}</div>
                  <div className="text-[10px] text-slate-400 uppercase">ЧП</div>
                </div>
              </div>
            </div>

            {/* Активные сотрудники */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-500 mb-3 flex items-center justify-between">
                <span>⚡ Работают на объектах сейчас</span>
                <span className="bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full text-[10px]">{activeEmployees.length}</span>
              </h3>
              {activeEmployees.length === 0 ? <p className="text-xs text-slate-500">Нет активных смен</p> : (
                <div className="space-y-2">
                  {activeEmployees.map(emp => {
                    const liveSec = getEmployeeLiveTimer(emp);
                    return (
                      <div key={emp.id} className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
                        <div>
                          <span className="font-bold text-slate-100">{emp.name}</span> — <span className="text-amber-500 font-medium">{emp.status}</span>
                          <div className="font-mono text-[11px] text-slate-400 mt-0.5">Время: {formatTime(liveSec)}</div>
                          <div className="text-[11px] text-blue-400 mt-1">
                            {emp.lat && emp.lng ? (
                              <a href={`https://www.google.com/maps?q=${emp.lat},${emp.lng}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                📍 {emp.address || 'Адрес объекта'}
                              </a>
                            ) : <span className="text-slate-500">📍 Поиск геопозиции...</span>}
                          </div>
                        </div>
                        <button onClick={() => forceCloseEmployeeShift(emp)} className="bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white px-2.5 py-1.5 rounded-lg transition text-[11px] font-medium border border-rose-500/20">Закрыть смену</button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* База сотрудников и компактные штрафы */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-500 mb-3">👥 База сотрудников</h3>
              {employeesList.length === 0 ? <p className="text-xs text-slate-500">Список пуст</p> : (
                <div className="space-y-2">
                  {employeesList.map(emp => {
                    const empPenalties = penalties.filter(p => p.email === emp.email);
                    const isOpen = penaltyOpenEmail === emp.email;
                    return (
                      <div key={emp.id} className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs space-y-2">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-bold text-slate-200">{emp.name}</span>
                            <div className="text-[11px] text-slate-400">{emp.email}</div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => setPenaltyOpenEmail(isOpen ? null : emp.email)} className="bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-slate-950 px-2.5 py-1.5 rounded-lg transition font-medium border border-amber-500/20">
                              {isOpen ? 'Закрыть' : 'Штраф'}
                            </button>
                            <button onClick={() => deleteItem('employees', emp.id)} className="bg-slate-900 hover:bg-rose-600 text-slate-400 hover:text-white px-2 py-1.5 rounded-lg transition border border-slate-800">✕</button>
                          </div>
                        </div>

                        {/* Выпадающая компактная форма штрафа */}
                        {isOpen && (
                          <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-2 mt-2">
                            <div className="flex gap-2">
                              <input 
                                type="number" 
                                step="0.5" 
                                placeholder="Часы (напр. 1)" 
                                value={penaltyHoursInput[emp.email] || ''} 
                                onChange={e => setPenaltyHoursInput({ ...penaltyHoursInput, [emp.email]: e.target.value })}
                                className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white w-28 outline-none focus:border-amber-500"
                              />
                              <input 
                                type="text" 
                                placeholder="Причина вычета часов" 
                                value={penaltyReasonInput[emp.email] || ''} 
                                onChange={e => setPenaltyReasonInput({ ...penaltyReasonInput, [emp.email]: e.target.value })}
                                className="flex-1 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white outline-none focus:border-amber-500"
                              />
                              <button onClick={() => applyPenalty(emp.email, emp.name)} className="bg-rose-600 hover:bg-rose-500 text-white px-3 py-1 rounded font-medium">ОК</button>
                            </div>
                          </div>
                        )}

                        {empPenalties.length > 0 && (
                          <div className="pt-1 text-[11px] text-rose-400 space-y-0.5">
                            {empPenalties.map(p => (
                              <div key={p.id} className="flex justify-between items-center bg-slate-900/50 px-2 py-0.5 rounded">
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

            {/* История смен (компактная лента) */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-500 mb-3">📊 История отработанного времени</h3>
              {shiftHistory.length === 0 ? <p className="text-xs text-slate-500">История пуста</p> : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {shiftHistory.map(sh => (
                    <div key={sh.id} className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-slate-200">{sh.name}</span>
                        <div className="text-[11px] text-slate-400">{sh.date} • 📍 {sh.address}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-amber-500 font-bold">{formatTime(sh.totalTime)}</span>
                        <button onClick={() => deleteItem('shift_history', sh.id)} className="text-slate-500 hover:text-rose-400">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Материалы и обращения в две колонки / компактно */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-500 mb-3">📦 Заказы материалов</h3>
                {materials.length === 0 ? <p className="text-xs text-slate-500">Нет заказов</p> : (
                  <div className="space-y-2">
                    {materials.map(m => (
                      <div key={m.id} className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-xs space-y-1">
                        <div className="flex justify-between font-medium">
                          <span className="text-slate-200">{m.name} ({m.qty})</span>
                          <button onClick={() => deleteItem('materials', m.id)} className="text-slate-500 hover:text-rose-400">✕</button>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-400">От: {m.user}</span>
                          <select value={m.status} onChange={e => updateMaterialStatus(m.id, e.target.value)} className="bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-amber-500">
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

              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-500 mb-3">💬 Обращения сотрудников</h3>
                {issues.length === 0 ? <p className="text-xs text-slate-500">Нет обращений</p> : (
                  <div className="space-y-2">
                    {issues.map(i => (
                      <div key={i.id} className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-xs space-y-1">
                        <div className="flex justify-between font-medium">
                          <span className="text-slate-200">{i.user}: {i.text}</span>
                          <button onClick={() => deleteItem('issues', i.id)} className="text-slate-500 hover:text-rose-400">✕</button>
                        </div>
                        <div className="flex justify-end">
                          <select value={i.status} onChange={e => updateIssueStatus(i.id, e.target.value)} className="bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-amber-500 text-[11px]">
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
              <div className="bg-rose-950/20 border border-rose-500/30 p-4 rounded-2xl">
                <h3 className="text-xs font-semibold text-rose-400 uppercase tracking-wider mb-2">🚨 Экстренные ЧП</h3>
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
