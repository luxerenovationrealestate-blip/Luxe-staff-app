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

  const [role, setRole] = useState('employee');
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

    return () => {
      unsubMaterials();
      unsubIssues();
      unsubEmergencies();
      unsubShifts();
      unsubHistory();
      unsubEmployees();
    };
  }, []);

  // Функция обновления геолокации и отправки данных в базу
  const updateGeoLocation = async (currentSeconds, currentStatus, activeStartTime, activePausedSec) => {
    if (navigator.geolocation && user && user.role === 'employee') {
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
          // Если геолокация недоступна, всё равно отправляем данные таймера
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
      
      // Обновляем данные в базе каждые 15 секунд
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
      if (user && user.role === 'employee') {
        const empDocId = user.email.replace(/[@.]/g, '_');
        const activeEmpData = activeEmployees.find(e => e.id === empDocId);
        if (activeEmpData && activeEmpData.address) {
          currentShiftAddress = activeEmpData.address;
        }
      }

      if (timer > 0 && user && user.role === 'employee') {
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

      if (user && user.role === 'employee') {
        await db.collection('shifts').doc(user.email.replace(/[@.]/g, '_')).delete();
      }
    }

    setShiftStatus(status);

    if (status !== 'off' && user && user.role === 'employee') {
      // Сразу отправляем корректный newStartTime в базу
      await updateGeoLocation(finalTimer, statusText, newStartTime, newPausedSeconds);
    }
  };

  const addMaterial = async (e) => {
    e.preventDefault();
    if (!matName) return;
    await db.collection('materials').add({
      user: user.name,
      name: matName,
      qty: matQty,
      status: user.role === 'owner' ? 'Заказано' : 'В обработке',
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
      <div className="flex items-center justify-center min-h-screen p-4 bg-slate-900">
        <div className="bg-slate-800 p-8 rounded-2xl max-w-md w-full border border-slate-700 shadow-xl text-white">
          <h1 className="text-2xl font-bold text-amber-500 mb-1 text-center">Luxe Renovation</h1>
          <p className="text-slate-400 text-xs mb-6 text-center">{companyEmail}</p>

          <div className="flex bg-slate-900 rounded-lg p-1 mb-6">
            <button type="button" className={`flex-1 py-2 text-sm font-medium rounded-md ${!isRegister ? 'bg-amber-500 text-slate-950' : 'text-slate-400'}`} onClick={() => setIsRegister(false)}>Вход</button>
            <button type="button" className={`flex-1 py-2 text-sm font-medium rounded-md ${isRegister ? 'bg-amber-500 text-slate-950' : 'text-slate-400'}`} onClick={() => setIsRegister(true)}>Регистрация</button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-xs text-slate-400 mb-1">ФИО / Имя</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white" placeholder="Иван Иванов" required />
              </div>
            )}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white" placeholder="name@example.com" required />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Пароль</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white" placeholder="••••••••" required />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Роль аккаунта</label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" className={`p-3 border rounded-xl text-left ${role === 'employee' ? 'border-amber-500 bg-amber-500/10' : 'border-slate-700'}`} onClick={() => setRole('employee')}>
                  <div className="font-semibold text-sm">Сотрудник</div>
                </button>
                <button type="button" className={`p-3 border rounded-xl text-left ${role === 'owner' ? 'border-amber-500 bg-amber-500/10' : 'border-slate-700'}`} onClick={() => setRole('owner')}>
                  <div className="font-semibold text-sm">Владелец</div>
                </button>
              </div>
            </div>

            <button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-3 rounded-xl transition">
              {isRegister ? 'Зарегистрироваться' : 'Войти'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="bg-slate-800 border-b border-slate-700 p-4 flex justify-between items-center">
        <div>
          <h1 className="font-bold text-amber-500">Luxe Renovation</h1>
          <p className="text-xs text-slate-400">{user.name} ({user.role === 'owner' ? 'Владелец' : 'Сотрудник'}) • <a href={`mailto:${companyEmail}`} className="text-amber-400 hover:underline">{companyEmail}</a></p>
        </div>
        <button onClick={() => setUser(null)} className="text-xs bg-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-600">Выйти</button>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6">
        {user.role === 'employee' ? (
          <>
            <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl text-center">
              <div className="text-4xl font-mono font-bold mb-4 text-amber-500">{formatTime(timer)}</div>
              <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
                <button onClick={() => changeShift('working')} className={`p-3 rounded-xl font-medium ${shiftStatus === 'working' ? 'bg-green-600 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}>Старт</button>
                <button onClick={() => changeShift('break')} className={`p-3 rounded-xl font-medium ${shiftStatus === 'break' ? 'bg-yellow-600 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}>Обед</button>
                <button onClick={() => changeShift('off')} className="p-3 bg-red-600 hover:bg-red-700 rounded-xl font-medium">Конец</button>
              </div>
            </div>

            {shiftStatus !== 'off' && (
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
                  <h3 className="font-semibold mb-3 text-amber-400">📦 Заказ материалов</h3>
                  <form onSubmit={addMaterial} className="space-y-3">
                    <input type="text" placeholder="Название (например: Шпаклевка 25кг)" value={matName} onChange={e => setMatName(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white" />
                    <input type="text" placeholder="Количество (например: 5 мешков)" value={matQty} onChange={e => setMatQty(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white" />
                    <button type="submit" className="w-full bg-amber-500 text-slate-950 py-2 rounded-lg font-medium text-sm">Заказать</button>
                  </form>
                </div>

                <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
                  <h3 className="font-semibold mb-3 text-amber-400">💬 Обращение к владельцу</h3>
                  <form onSubmit={addIssue} className="space-y-3">
                    <textarea placeholder="Опишите вопрос или проблему на объекте..." value={issueText} onChange={e => setIssueText(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm h-20 text-white"></textarea>
                    <button type="submit" className="w-full bg-amber-500 text-slate-950 py-2 rounded-lg font-medium text-sm">Отправить</button>
                  </form>
                </div>

                <div className="bg-slate-800 p-5 rounded-2xl border border-red-500/30 md:col-span-2">
                  <h3 className="font-semibold mb-3 text-red-400">🚨 Форс-мажор / ЧП</h3>
                  <form onSubmit={addEmergency} className="flex gap-2">
                    <input type="text" placeholder="Срочное сообщение про ЧП на объекте..." value={emText} onChange={e => setEmText(e.target.value)} className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white" />
                    <button type="submit" className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium text-sm">Сообщить</button>
                  </form>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-6">
            <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
              <h2 className="text-xl font-bold mb-4 text-amber-500">Панель Управления Владельца</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                  <div className="text-2xl font-bold text-amber-400">{employeesList.length}</div>
                  <div className="text-xs text-slate-400">Всего сотрудников</div>
                </div>
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                  <div className="text-2xl font-bold">{materials.length}</div>
                  <div className="text-xs text-slate-400">Заказов материалов</div>
                </div>
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                  <div className="text-2xl font-bold">{issues.length}</div>
                  <div className="text-xs text-slate-400">Обращений</div>
                </div>
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                  <div className="text-2xl font-bold text-red-500">{emergencies.length}</div>
                  <div className="text-xs text-slate-400">Форс-мажоров</div>
                </div>
              </div>
            </div>

            <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
              <h3 className="font-semibold mb-3 text-amber-400">📇 База сотрудников компании ({employeesList.length})</h3>
              {employeesList.length === 0 ? <p className="text-xs text-slate-500">В базе пока нет сотрудников</p> : (
                <div className="space-y-2">
                  {employeesList.map(emp => (
                    <div key={emp.id} className="bg-slate-900 p-3 rounded-lg flex justify-between items-center text-sm">
                      <div>
                        <span className="font-bold text-white">{emp.name}</span>
                        <div className="text-xs text-slate-400">{emp.email}</div>
                      </div>
                      <button onClick={() => deleteItem('employees', emp.id)} className="text-xs bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white px-2.5 py-1 rounded transition">Удалить</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
              <h3 className="font-semibold mb-3 text-amber-400">👷 Активные сотрудники на объектах сейчас</h3>
              {activeEmployees.length === 0 ? <p className="text-xs text-slate-500">Нет работающих в данный момент</p> : (
                <div className="space-y-3">
                  {activeEmployees.map(emp => {
                    const liveSec = getEmployeeLiveTimer(emp);
                    return (
                      <div key={emp.id} className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col gap-2">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                          <div>
                            <div className="font-bold text-white text-base">
                              {emp.name} — <span className="text-amber-400">{emp.status}</span>
                            </div>
                            <div className="text-xs text-slate-400 font-mono mt-0.5">
                              Время работы: {formatTime(liveSec)}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-2 border-t border-slate-800 text-xs">
                          <span className="text-base">📍</span>
                          {emp.lat && emp.lng ? (
                            <a 
                              href={`https://www.google.com/maps?q=${emp.lat},${emp.lng}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:underline font-medium flex items-center gap-1"
                            >
                              {emp.address || 'Определяем адрес...'} (Открыть на карте)
                            </a>
                          ) : (
                            <span className="text-slate-500">Ожидание геолокации от сотрудника...</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
              <h3 className="font-semibold mb-3 text-amber-400">📊 История отработанного времени и объектов</h3>
              {shiftHistory.length === 0 ? <p className="text-xs text-slate-500">История смен пока пуста</p> : (
                <div className="space-y-3">
                  {shiftHistory.map(sh => (
                    <div key={sh.id} className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-sm">
                      <div>
                        <div className="font-bold text-white text-base">{sh.name}</div>
                        <div className="text-xs text-slate-400">{sh.date}</div>
                        <div className="text-xs text-amber-400/90 mt-1 flex items-center gap-1 font-medium">
                          📍 {sh.address || 'Адрес не указан'}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                        <span className="font-mono text-amber-400 font-bold text-base">{formatTime(sh.totalTime)}</span>
                        <button onClick={() => deleteItem('shift_history', sh.id)} className="text-xs bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white px-2.5 py-1.5 rounded-lg transition">Удалить</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {emergencies.length > 0 && (
              <div className="bg-red-950/40 border border-red-500/50 p-5 rounded-2xl">
                <h3 className="font-semibold text-red-400 mb-3">🚨 Экстренные сообщения</h3>
                <div className="space-y-2">
                  {emergencies.map(e => (
                    <div key={e.id} className="bg-slate-900 p-3 rounded-lg flex justify-between items-center text-sm">
                      <div><span className="font-bold text-red-400">{e.user}:</span> {e.text}</div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500">{e.time}</span>
                        <button onClick={() => deleteItem('emergencies', e.id)} className="text-xs bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white px-2 py-1 rounded transition">Удалить</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
              <h3 className="font-semibold mb-3 text-amber-400">📦 Заказы материалов (Управление)</h3>
              {materials.length === 0 ? <p className="text-xs text-slate-500">Заказов пока нет</p> : (
                <div className="space-y-3">
                  {materials.map(m => (
                    <div key={m.id} className="bg-slate-900 p-3 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-sm">
                      <div>
                        <span className="font-bold text-amber-400">{m.user}:</span> {m.name} ({m.qty})
                      </div>
                      <div className="flex items-center gap-2">
                        <select 
                          value={m.status} 
                          onChange={(e) => updateMaterialStatus(m.id, e.target.value)}
                          className="bg-slate-800 border border-slate-700 text-xs rounded px-2 py-1 text-white"
                        >
                          <option value="В обработке">В обработке</option>
                          <option value="Заказано">Заказано</option>
                          <option value="Доставлено">Доставлено</option>
                          <option value="Отменено">Отменено</option>
                        </select>
                        <button onClick={() => deleteItem('materials', m.id)} className="text-xs bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white px-2.5 py-1 rounded transition">Удалить</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
              <h3 className="font-semibold mb-3 text-amber-400">💬 Обращения работников (Управление)</h3>
              {issues.length === 0 ? <p className="text-xs text-slate-500">Обращений пока нет</p> : (
                <div className="space-y-3">
                  {issues.map(i => (
                    <div key={i.id} className="bg-slate-900 p-3 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-sm">
                      <div>
                        <span className="font-bold text-amber-400">{i.user}:</span> {i.text}
                      </div>
                      <div className="flex items-center gap-2">
                        <select 
                          value={i.status} 
                          onChange={(e) => updateIssueStatus(i.id, e.target.value)}
                          className="bg-slate-800 border border-slate-700 text-xs rounded px-2.5 py-1 text-white"
                        >
                          <option value="Открыто">Открыто</option>
                          <option value="В работе">В работе</option>
                          <option value="Решено">Решено</option>
                        </select>
                        <button onClick={() => deleteItem('issues', i.id)} className="text-xs bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white px-2.5 py-1 rounded transition">Удалить</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
