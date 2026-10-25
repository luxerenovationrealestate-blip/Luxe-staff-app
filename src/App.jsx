import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, onSnapshot, query, doc, setDoc } from 'firebase/firestore';

// Ваши персональные ключи Firebase
const firebaseConfig = {
  apiKey: "AIzaSyD6wwP7nh0sq_7xe3d8Zv62R_KrwJtghH0",
  authDomain: "luxe-renovation-72e1a.firebaseapp.com",
  projectId: "luxe-renovation-72e1a",
  storageBucket: "luxe-renovation-72e1a.firebasestorage.app",
  messagingSenderId: "768348735399",
  appId: "1:768348735399:web:e42045b5232caa5189d882"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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

  const [shiftStatus, setShiftStatus] = useState('off');
  const [timer, setTimer] = useState(0);

  const [materials, setMaterials] = useState([]);
  const [issues, setIssues] = useState([]);
  const [emergencies, setEmergencies] = useState([]);
  const [activeEmployees, setActiveEmployees] = useState([]);

  const [matName, setMatName] = useState('');
  const [matQty, setMatQty] = useState('');
  const [issueText, setIssueText] = useState('');
  const [emText, setEmText] = useState('');

  const companyEmail = 'luxerenovationrealestate@gmail.com';

  // Синхронизация всех данных из облака в реальном времени
  useEffect(() => {
    const unsubMaterials = onSnapshot(query(collection(db, 'materials')), (snapshot) => {
      setMaterials(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubIssues = onSnapshot(query(collection(db, 'issues')), (snapshot) => {
      setIssues(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubEmergencies = onSnapshot(query(collection(db, 'emergencies')), (snapshot) => {
      setEmergencies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubShifts = onSnapshot(query(collection(db, 'shifts')), (snapshot) => {
      setActiveEmployees(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubMaterials();
      unsubIssues();
      unsubEmergencies();
      unsubShifts();
    };
  }, []);

  // Сохранение пользователя локально
  useEffect(() => {
    localStorage.setItem('luxe_user', JSON.stringify(user));
  }, [user]);

  // Таймер смены
  useEffect(() => {
    let interval;
    if (shiftStatus === 'working') {
      interval = setInterval(() => {
        setTimer(t => {
          const newTime = t + 1;
          if (user && user.role === 'employee') {
            setDoc(doc(db, 'shifts', user.email.replace(/[@.]/g, '_')), {
              name: user.name,
              email: user.email,
              status: 'Работает',
              timer: newTime,
              updatedAt: Date.now()
            });
          }
          return newTime;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [shiftStatus, user]);

  const formatTime = (sec) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleAuth = (e) => {
    e.preventDefault();
    if (!email || !password) return alert('Заполните данные!');
    setUser({ email, name: name || email.split('@')[0], role });
  };

  const changeShift = async (status) => {
    setShiftStatus(status);
    if (user && user.role === 'employee') {
      await setDoc(doc(db, 'shifts', user.email.replace(/[@.]/g, '_')), {
        name: user.name,
        email: user.email,
        status: status === 'working' ? 'Работает' : status === 'break' ? 'Обед' : 'Завершил смену',
        timer: timer,
        updatedAt: Date.now()
      });
    }
  };

  const addMaterial = async (e) => {
    e.preventDefault();
    if (!matName) return;
    await addDoc(collection(db, 'materials'), {
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
    await addDoc(collection(db, 'issues'), {
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
    await addDoc(collection(db, 'emergencies'), {
      user: user.name,
      text: emText,
      time: new Date().toLocaleTimeString(),
      timestamp: Date.now()
    });
    setEmText('');
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
              <div className="grid grid-cols-3 gap-4 text-center">
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
              <h3 className="font-semibold mb-3 text-amber-400">👷 Статус сотрудников на объектах</h3>
              {activeEmployees.length === 0 ? <p className="text-xs text-slate-500">Нет активных смен</p> : (
                <div className="space-y-2">
                  {activeEmployees.map(emp => (
                    <div key={emp.id} className="bg-slate-900 p-3 rounded-lg flex justify-between items-center text-sm">
                      <div>
                        <span className="font-bold text-white">{emp.name}</span> — <span className="text-amber-400">{emp.status}</span>
                      </div>
                      <div className="font-mono text-green-400">Время: {formatTime(emp.timer || 0)}</div>
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
                      <span className="text-xs text-slate-500">{e.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
              <h3 className="font-semibold mb-3 text-amber-400">📦 Заказы материалов</h3>
              {materials.length === 0 ? <p className="text-xs text-slate-500">Заказов пока нет</p> : (
                <div className="space-y-2">
                  {materials.map(m => (
                    <div key={m.id} className="bg-slate-900 p-3 rounded-lg flex justify-between items-center text-sm">
                      <div>
                        <span className="font-bold text-amber-400">{m.user}:</span> {m.name} ({m.qty})
                      </div>
                      <span className="text-xs bg-amber-500/10 text-amber-400 px-2 py-1 rounded border border-amber-500/20">{m.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
              <h3 className="font-semibold mb-3 text-amber-400">💬 Обращения работников</h3>
              {issues.length === 0 ? <p className="text-xs text-slate-500">Обращений пока нет</p> : (
                <div className="space-y-2">
                  {issues.map(i => (
                    <div key={i.id} className="bg-slate-900 p-3 rounded-lg flex justify-between items-center text-sm">
                      <div>
                        <span className="font-bold text-amber-400">{i.user}:</span> {i.text}
                      </div>
                      <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-1 rounded border border-blue-500/20">{i.status}</span>
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
