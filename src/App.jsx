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

  // Активная вкладка меню в стиле сайта Luxe Renovation
  const [activeTab, setActiveTab] = useState('shift'); // 'shift', 'photos', 'materials', 'contacts'

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
  const [projectsList, setProjectsList] = useState([]);
  const [photoReports, setPhotoReports] = useState([]);

  const [selectedProjectId, setSelectedProjectId] = useState(() => localStorage.getItem('luxe_selected_project') || '');

  const [penaltyOpenEmail, setPenaltyOpenEmail] = useState(null);
  const [penaltyHoursInput, setPenaltyHoursInput] = useState({});
  const [penaltyReasonInput, setPenaltyReasonInput] = useState({});

  const [matName, setMatName] = useState('');
  const [matQty, setMatQty] = useState('');
  const [issueText, setIssueText] = useState('');
  const [emText, setEmText] = useState('');

  const [newProjName, setNewProjName] = useState('');
  const [newProjAddress, setNewProjAddress] = useState('');

  const [photoFileBase64, setPhotoFileBase64] = useState('');
  const [photoComment, setPhotoComment] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

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
    const unsubProjects = db.collection('projects').onSnapshot((snapshot) => {
      setProjectsList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubPhotos = db.collection('photo_reports').orderBy('timestamp', 'desc').onSnapshot((snapshot) => {
      setPhotoReports(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubMaterials();
      unsubIssues();
      unsubEmergencies();
      unsubShifts();
      unsubHistory();
      unsubEmployees();
      unsubPenalties();
      unsubProjects();
      unsubPhotos();
    };
  }, []);

  const updateGeoLocation = async (currentSeconds, currentStatus, activeStartTime, activePausedSec) => {
    if (navigator.geolocation && user && user.email !== companyEmail) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          let fullAddr = 'Определяется адрес объекта...';
          const matchedProj = projectsList.find(p => p.id === selectedProjectId);
          if (matchedProj) {
            fullAddr = `${matchedProj.name} (${matchedProj.address})`;
          } else {
            try {
              const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
                headers: { 'Accept-Language': 'ru' }
              });
              const data = await res.json();
              if (data && data.address) {
                const addr = data.address;
                const road = addr.road || addr.pedestrian || addr.suburb || '';
                const house = addr.house_number ? `д. ${addr.house_number}` : '';
                const city = addr.city || addr.town || addr.municipality || '';
                fullAddr = [road, house, city].filter(Boolean).join(', ') || data.display_name;
              }
            } catch (e) {
              console.log('Geocoding error:', e);
            }
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
            projectName: matchedProj ? matchedProj.name : 'Произвольный объект',
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
        { enableHighAccuracy: true, timeout: 5000 }
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
  }, [now, shiftStatus, startTime, pausedSeconds, user, selectedProjectId]);

  useEffect(() => {
    localStorage.setItem('luxe_user', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    localStorage.setItem('luxe_shift_status', shiftStatus);
    if (startTime) localStorage.setItem('luxe_start_time', startTime);
    else localStorage.removeItem('luxe_start_time');
    localStorage.setItem('luxe_paused_sec', pausedSeconds);
    localStorage.setItem('luxe_selected_project', selectedProjectId);
  }, [shiftStatus, startTime, pausedSeconds, selectedProjectId]);

  const formatTime = (sec) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    if (!email || !password) return alert('Заполните все поля!');
    
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
      if (!selectedProjectId) {
        alert('Выберите объект перед стартом смены!');
        return;
      }
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
      let currentProjectName = 'Объект не указан';
      if (user && user.email !== companyEmail) {
        const empDocId = user.email.replace(/[@.]/g, '_');
        const activeEmpData = activeEmployees.find(e => e.id === empDocId);
        if (activeEmpData) {
          currentShiftAddress = activeEmpData.address || 'Адрес не указан';
          currentProjectName = activeEmpData.projectName || 'Объект';
        }
      }

      if (timer > 0 && user && user.email !== companyEmail) {
        const historyId = `${user.email.replace(/[@.]/g, '_')}_${currentTime}`;
        await db.collection('shift_history').doc(historyId).set({
          name: user.name,
          email: user.email,
          totalTime: timer,
          projectName: currentProjectName,
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
      const historyId = `${emp.email.replace(/[@.]/g, '_')}_${Date.now()}`;
      await db.collection('shift_history').doc(historyId).set({
        name: emp.name,
        email: emp.email,
        totalTime: emp.timer || 0,
        projectName: emp.projectName || 'Объект',
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
      alert('Укажите корректные часы вычета');
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

  const addProject = async (e) => {
    e.preventDefault();
    if (!newProjName || !newProjAddress) return alert('Заполните название и адрес объекта!');
    await db.collection('projects').add({
      name: newProjName,
      address: newProjAddress,
      timestamp: Date.now()
    });
    setNewProjName('');
    setNewProjAddress('');
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const img = new Image();
    const reader = new FileReader();

    reader.onload = (event) => {
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        setPhotoFileBase64(dataUrl);
      };
    };
    reader.readAsDataURL(file);
  };

  const submitPhotoReport = async (e) => {
    e.preventDefault();
    if (!photoFileBase64) return alert('Сделайте или выберите фотографию!');
    setIsUploadingPhoto(true);

    let currentAddr = 'Адрес объекта не определен';
    const matchedProj = projectsList.find(p => p.id === selectedProjectId);
    if (matchedProj) currentAddr = `${matchedProj.name} (${matchedProj.address})`;

    const saveReport = async (lat = null, lng = null) => {
      try {
        await db.collection('photo_reports').add({
          userName: user.name,
          userEmail: user.email,
          image: photoFileBase64,
          comment: photoComment || 'Отчет за смену',
          address: currentAddr,
          lat: lat,
          lng: lng,
          date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString(),
          timestamp: Date.now()
        });
        setPhotoFileBase64('');
        setPhotoComment('');
        alert('Фотоотчет успешно отправлен руководителю!');
      } catch (err) {
        console.error('Ошибка отправки:', err);
        alert('Ошибка при отправке фотоотчета.');
      } finally {
        setIsUploadingPhoto(false);
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => saveReport(pos.coords.latitude, pos.coords.longitude),
        () => saveReport(),
        { timeout: 3500 }
      );
    } else {
      saveReport();
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

  // ЭКРАН ВХОДА (Элитный темный стиль с золотом в стиле лендинга)
  if (!user) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-4 font-sans text-slate-100 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-[#0B0F19] to-[#07090F] pointer-events-none"></div>

        <div className="relative w-full max-w-sm bg-[#111827]/90 backdrop-blur-xl border border-amber-500/30 p-8 rounded-3xl shadow-2xl shadow-black/80">
          <div className="text-center mb-8">
            <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 items-center justify-center text-[#0B0F19] font-black text-lg mb-3 shadow-lg shadow-amber-500/20">
              LR
            </div>
            <h1 className="text-sm font-black tracking-widest text-amber-400 uppercase">LUXE RENOVATION</h1>
            <div className="h-0.5 w-10 bg-amber-500/50 mx-auto my-2 rounded-full"></div>
            <p className="text-[10px] text-slate-400 font-medium tracking-wider">COPENHAGEN • INTERIOR & CONSTRUCTION</p>
          </div>

          <div className="flex bg-[#0B0F19] p-1 rounded-xl mb-6 border border-slate-800 text-xs font-semibold">
            <button type="button" className={`flex-1 py-2 rounded-lg transition-all ${!isRegister ? 'bg-amber-500 text-[#0B0F19] font-bold shadow-md' : 'text-slate-400 hover:text-white'}`} onClick={() => setIsRegister(false)}>Вход</button>
            <button type="button" className={`flex-1 py-2 rounded-lg transition-all ${isRegister ? 'bg-amber-500 text-[#0B0F19] font-bold shadow-md' : 'text-slate-400 hover:text-white'}`} onClick={() => setIsRegister(true)}>Регистрация</button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4 text-xs">
            {isRegister && (
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Имя и Фамилия</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-[#0B0F19] border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-amber-500 outline-none transition" placeholder="Станислав" required />
              </div>
            )}
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-[#0B0F19] border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-amber-500 outline-none transition" placeholder="name@domain.com" required />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Пароль</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-[#0B0F19] border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-amber-500 outline-none transition" placeholder="••••••••" required />
            </div>

            <button type="submit" className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:opacity-95 text-[#0B0F19] font-black py-3.5 rounded-xl transition-all shadow-lg shadow-amber-500/20 uppercase tracking-wider text-[11px] mt-2">
              {isRegister ? 'Создать аккаунт' : 'Войти в систему'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const isOwner = user.email.toLowerCase() === companyEmail.toLowerCase();

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 font-sans antialiased pb-16">
      {/* ПРЕМИАЛЬНАЯ ШАПКА В СТИЛЕ САЙТА С ВКЛАДКАМИ */}
      <header className="bg-[#111827]/90 backdrop-blur-xl border-b border-amber-500/20 px-4 py-3 sticky top-0 z-50 shadow-2xl">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-[#0B0F19] font-black text-xs shadow-md">LR</div>
            <div>
              <h1 className="font-black text-xs text-amber-400 tracking-widest uppercase">LUXE RENOVATION</h1>
              <p className="text-[10px] text-slate-400 font-medium">{user.name} • <span className="text-amber-500">{isOwner ? 'Руководитель' : 'Специалист'}</span></p>
            </div>
          </div>
          <button onClick={() => setUser(null)} className="text-[11px] bg-slate-800/80 hover:bg-slate-700 text-slate-300 px-3.5 py-1.5 rounded-xl border border-slate-700 transition font-medium">Выйти</button>
        </div>

        {/* Навигационные вкладки в стиле сайта */}
        <div className="max-w-4xl mx-auto flex gap-1.5 mt-3 overflow-x-auto pb-1 text-xs font-semibold">
          <button onClick={() => setActiveTab('shift')} className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap ${activeTab === 'shift' ? 'bg-amber-500 text-[#0B0F19] font-bold shadow-md shadow-amber-500/20' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'}`}>
            ⏱️ Смена и Управление
          </button>
          <button onClick={() => setActiveTab('photos')} className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap ${activeTab === 'photos' ? 'bg-amber-500 text-[#0B0F19] font-bold shadow-md shadow-amber-500/20' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'}`}>
            📸 Фотоотчеты
          </button>
          <button onClick={() => setActiveTab('materials')} className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap ${activeTab === 'materials' ? 'bg-amber-500 text-[#0B0F19] font-bold shadow-md shadow-amber-500/20' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'}`}>
            📦 Материалы и Связь
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-4">
        {!isOwner ? (
          <>
            {/* ВКЛАДКА 1: СМЕНА СОТРУДНИКА */}
            {activeTab === 'shift' && (
              <div className="space-y-4">
                <div className="bg-[#111827]/90 backdrop-blur-xl border border-amber-500/20 p-6 rounded-3xl shadow-2xl text-center space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 text-left">🏗️ Выберите рабочий объект:</label>
                    <select 
                      value={selectedProjectId} 
                      onChange={e => setSelectedProjectId(e.target.value)}
                      className="w-full bg-[#0B0F19] border border-slate-800 rounded-2xl p-3 text-xs font-semibold text-slate-100 outline-none focus:border-amber-500 shadow-inner"
                    >
                      <option value="">-- Выберите объект из списка --</option>
                      {projectsList.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.address})</option>
                      ))}
                    </select>
                  </div>

                  <div className="pt-2">
                    <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">Отработанное время смены</div>
                    <div className="text-5xl font-mono font-black text-amber-400 tracking-tight">{formatTime(timer)}</div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto pt-2">
                    <button onClick={() => changeShift('working')} className={`py-3 rounded-2xl text-xs font-bold transition-all ${shiftStatus === 'working' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}>Старт</button>
                    <button onClick={() => changeShift('break')} className={`py-3 rounded-2xl text-xs font-bold transition-all ${shiftStatus === 'break' ? 'bg-amber-600 text-white shadow-lg' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}>Обед</button>
                    <button onClick={() => changeShift('off')} className="py-3 bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white rounded-2xl text-xs font-bold transition border border-rose-500/30">Финиш</button>
                  </div>
                </div>
              </div>
            )}

            {/* ВКЛАДКА 2: ФОТООТЧЕТЫ */}
            {activeTab === 'photos' && (
              <div className="bg-[#111827]/90 backdrop-blur-xl border border-amber-500/20 p-5 rounded-3xl shadow-2xl space-y-3">
                <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">📸 Сделать фото или загрузить отчёт</h3>
                <p className="text-[11px] text-slate-400">Снимок с камеры или из галереи с автоматической фиксацией геопозиции и адреса.</p>
                
                <form onSubmit={submitPhotoReport} className="space-y-3 text-xs">
                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment"
                    onChange={handleImageUpload} 
                    className="w-full bg-[#0B0F19] border border-slate-800 rounded-2xl p-2.5 text-xs text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-amber-500 file:text-[#0B0F19] hover:file:bg-amber-400 cursor-pointer" 
                  />
                  
                  {photoFileBase64 && (
                    <div className="relative w-full h-48 rounded-2xl overflow-hidden border border-slate-800 shadow-sm">
                      <img src={photoFileBase64} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                  
                  <input 
                    type="text" 
                    placeholder="Комментарий (напр.: Завершен малярный этап)" 
                    value={photoComment} 
                    onChange={e => setPhotoComment(e.target.value)} 
                    className="w-full bg-[#0B0F19] border border-slate-800 rounded-2xl p-3 text-xs text-slate-100 outline-none focus:border-amber-500" 
                  />
                  
                  <button 
                    type="submit" 
                    disabled={isUploadingPhoto} 
                    className="w-full bg-amber-500 hover:bg-amber-400 text-[#0B0F19] font-bold py-3.5 rounded-2xl transition shadow-md disabled:opacity-50"
                  >
                    {isUploadingPhoto ? 'Отправка фотоотчета...' : 'Отправить фотоотчет руководителю'}
                  </button>
                </form>
              </div>
            )}

            {/* ВКЛАДКА 3: МАТЕРИАЛЫ И СВЯЗЬ */}
            {activeTab === 'materials' && (
              <div className="grid md:grid-cols-2 gap-3">
                <div className="bg-[#111827]/90 backdrop-blur-xl border border-amber-500/20 p-4 rounded-3xl shadow-2xl">
                  <h3 className="text-xs font-bold mb-3 text-amber-400 uppercase tracking-wider">📦 Заказ материалов</h3>
                  <form onSubmit={addMaterial} className="space-y-2.5 text-xs">
                    <input type="text" placeholder="Материал (напр. Knauf Rotband)" value={matName} onChange={e => setMatName(e.target.value)} className="w-full bg-[#0B0F19] border border-slate-800 rounded-2xl p-3 text-slate-100 outline-none focus:border-amber-500" />
                    <input type="text" placeholder="Количество..." value={matQty} onChange={e => setMatQty(e.target.value)} className="w-full bg-[#0B0F19] border border-slate-800 rounded-2xl p-3 text-slate-100 outline-none focus:border-amber-500" />
                    <button type="submit" className="w-full bg-amber-500 text-[#0B0F19] py-2.5 rounded-2xl font-bold transition">Заказать</button>
                  </form>
                </div>

                <div className="bg-[#111827]/90 backdrop-blur-xl border border-amber-500/20 p-4 rounded-3xl shadow-2xl">
                  <h3 className="text-xs font-bold mb-3 text-amber-400 uppercase tracking-wider">💬 Связь с владельцем</h3>
                  <form onSubmit={addIssue} className="space-y-2.5 text-xs">
                    <textarea placeholder="Опишите вопрос..." value={issueText} onChange={e => setIssueText(e.target.value)} className="w-full bg-[#0B0F19] border border-slate-800 rounded-2xl p-3 text-slate-100 h-[86px] outline-none focus:border-amber-500 resize-none"></textarea>
                    <button type="submit" className="w-full bg-amber-500 text-[#0B0F19] py-2.5 rounded-2xl font-bold transition">Отправить</button>
                  </form>
                </div>
              </div>
            )}
          </>
        ) : (
          /* ПАНЕЛЬ ВЛАДЕЛЬЦА (LUXE ADMIN С ВКЛАДКАМИ) */
          <div className="space-y-4">
            <div className="bg-[#111827]/90 backdrop-blur-xl border border-amber-500/20 p-5 rounded-3xl shadow-2xl">
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">Панель Руководителя Luxe Renovation</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 text-center">
                <div className="bg-[#0B0F19] p-3.5 rounded-2xl border border-slate-800">
                  <div className="text-xl font-black text-amber-400">{employeesList.length}</div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold mt-0.5">Сотрудники</div>
                </div>
                <div className="bg-[#0B0F19] p-3.5 rounded-2xl border border-slate-800">
                  <div className="text-xl font-black text-slate-100">{projectsList.length}</div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold mt-0.5">Объекты</div>
                </div>
                <div className="bg-[#0B0F19] p-3.5 rounded-2xl border border-slate-800">
                  <div className="text-xl font-black text-slate-100">{materials.length}</div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold mt-0.5">Заказы</div>
                </div>
                <div className="bg-[#0B0F19] p-3.5 rounded-2xl border border-slate-800">
                  <div className="text-xl font-black text-rose-500">{emergencies.length}</div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold mt-0.5">ЧП</div>
                </div>
              </div>
            </div>

            {/* СПРАВОЧНИК ОБЪЕКТОВ */}
            <div className="bg-[#111827]/90 backdrop-blur-xl border border-amber-500/20 p-5 rounded-3xl shadow-2xl">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-3">🏢 Справочник строительных объектов</h3>
              <form onSubmit={addProject} className="grid sm:grid-cols-2 gap-2.5 mb-3 text-xs">
                <input type="text" placeholder="Название объекта (напр. Вилла Свенсен)" value={newProjName} onChange={e => setNewProjName(e.target.value)} className="bg-[#0B0F19] border border-slate-800 rounded-2xl p-3 text-slate-100 outline-none focus:border-amber-500" />
                <div className="flex gap-2">
                  <input type="text" placeholder="Точный адрес (Копенгаген)..." value={newProjAddress} onChange={e => setNewProjAddress(e.target.value)} className="flex-1 bg-[#0B0F19] border border-slate-800 rounded-2xl p-3 text-slate-100 outline-none focus:border-amber-500" />
                  <button type="submit" className="bg-amber-500 text-[#0B0F19] px-4 py-3 rounded-2xl font-bold">Добавить</button>
                </div>
              </form>
              <div className="space-y-2">
                {projectsList.map(pr => (
                  <div key={pr.id} className="bg-[#0B0F19] border border-slate-800 p-3 rounded-2xl flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-slate-100">{pr.name}</span>
                      <div className="text-[11px] text-slate-400">📍 {pr.address}</div>
                    </div>
                    <button onClick={() => deleteItem('projects', pr.id)} className="text-slate-500 hover:text-rose-400 font-bold px-2">✕</button>
                  </div>
                ))}
              </div>
            </div>

            {/* МОНИТОРИНГ СМЕН ОНЛАЙН */}
            <div className="bg-[#111827]/90 backdrop-blur-xl border border-amber-500/20 p-5 rounded-3xl shadow-2xl">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-3 flex items-center justify-between">
                <span>⚡ Мониторинг сотрудников онлайн</span>
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-mono">{activeEmployees.length} в работе</span>
              </h3>
              {activeEmployees.length === 0 ? <p className="text-xs text-slate-500">Нет активных смен на объектах</p> : (
                <div className="space-y-2.5">
                  {activeEmployees.map(emp => {
                    const liveSec = getEmployeeLiveTimer(emp);
                    return (
                      <div key={emp.id} className="bg-[#0B0F19] border border-slate-800 p-3.5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
                        <div>
                          <span className="font-bold text-slate-100 text-sm">{emp.name}</span> — <span className="text-amber-400 font-semibold">{emp.status}</span>
                          <div className="font-mono text-xs text-slate-400 mt-0.5">Время смены: {formatTime(liveSec)}</div>
                          <div className="text-[11px] text-blue-400 mt-1 font-semibold">
                            {emp.lat && emp.lng ? (
                              <a href={`https://www.google.com/maps?q=${emp.lat},${emp.lng}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                📍 {emp.address || 'Адрес объекта'}
                              </a>
                            ) : <span className="text-slate-500">📍 Поиск геопозиции...</span>}
                          </div>
                        </div>
                        <button onClick={() => forceCloseEmployeeShift(emp)} className="bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white px-3 py-2 rounded-xl transition text-xs font-semibold border border-rose-500/20">Закрыть смену</button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ГАЛЕРЕЯ ФОТООТЧЕТОВ */}
            <div className="bg-[#111827]/90 backdrop-blur-xl border border-amber-500/20 p-5 rounded-3xl shadow-2xl">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-3">🖼️ Галерея фотоотчетов сотрудников</h3>
              {photoReports.length === 0 ? <p className="text-xs text-slate-500">Фотоотчетов пока нет</p> : (
                <div className="grid sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
                  {photoReports.map(rep => (
                    <div key={rep.id} className="bg-[#0B0F19] border border-slate-800 p-3 rounded-2xl space-y-2 text-xs">
                      <div className="flex justify-between font-bold text-slate-100">
                        <span>{rep.userName}</span>
                        <button onClick={() => deleteItem('photo_reports', rep.id)} className="text-slate-500 hover:text-rose-400">✕</button>
                      </div>
                      <div className="w-full h-40 rounded-xl overflow-hidden border border-slate-800">
                        <img src={rep.image} alt="Report" className="w-full h-full object-cover" />
                      </div>
                      <p className="text-slate-300 font-medium">💬 {rep.comment}</p>
                      <div className="text-[11px] text-slate-400">📍 {rep.address}</div>
                      <div className="text-[10px] text-slate-500">{rep.date}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* БАЗА СОТРУДНИКОВ И ШТРАФЫ */}
            <div className="bg-[#111827]/90 backdrop-blur-xl border border-amber-500/20 p-5 rounded-3xl shadow-2xl">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-3">👥 База сотрудников и штрафные санкции</h3>
              {employeesList.length === 0 ? <p className="text-xs text-slate-500">Сотрудников нет</p> : (
                <div className="space-y-2.5">
                  {employeesList.map(emp => {
                    const empPenalties = penalties.filter(p => p.email === emp.email);
                    const isOpen = penaltyOpenEmail === emp.email;
                    return (
                      <div key={emp.id} className="bg-[#0B0F19] border border-slate-800 p-3.5 rounded-2xl text-xs space-y-2">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-bold text-slate-100 text-sm">{emp.name}</span>
                            <div className="text-[11px] text-slate-400">{emp.email}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => setPenaltyOpenEmail(isOpen ? null : emp.email)} className="bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-[#0B0F19] px-3 py-1.5 rounded-xl transition font-bold border border-amber-500/20 text-xs">
                              {isOpen ? 'Закрыть' : 'Штраф'}
                            </button>
                            <button onClick={() => deleteItem('employees', emp.id)} className="bg-slate-800 hover:bg-rose-600 text-slate-400 hover:text-white px-2.5 py-1.5 rounded-xl transition">✕</button>
                          </div>
                        </div>

                        {isOpen && (
                          <div className="bg-[#111827] p-3 rounded-2xl border border-slate-800 space-y-2 mt-2">
                            <div className="flex gap-2">
                              <input 
                                type="number" 
                                step="0.5" 
                                placeholder="Часы (-1)" 
                                value={penaltyHoursInput[emp.email] || ''} 
                                onChange={e => setPenaltyHoursInput({ ...penaltyHoursInput, [emp.email]: e.target.value })}
                                className="bg-[#0B0F19] border border-slate-800 rounded-xl px-3 py-1.5 text-slate-100 w-28 outline-none"
                              />
                              <input 
                                type="text" 
                                placeholder="Причина штрафа..." 
                                value={penaltyReasonInput[emp.email] || ''} 
                                onChange={e => setPenaltyReasonInput({ ...penaltyReasonInput, [emp.email]: e.target.value })}
                                className="flex-1 bg-[#0B0F19] border border-slate-800 rounded-xl px-3 py-1.5 text-slate-100 outline-none"
                              />
                              <button onClick={() => applyPenalty(emp.email, emp.name)} className="bg-rose-600 text-white px-4 py-1.5 rounded-xl font-bold">ОК</button>
                            </div>
                          </div>
                        )}

                        {empPenalties.length > 0 && (
                          <div className="pt-1 text-[11px] text-rose-400 space-y-1 font-semibold">
                            {empPenalties.map(p => (
                              <div key={p.id} className="flex justify-between items-center bg-rose-950/30 px-2.5 py-1 rounded-xl border border-rose-500/20">
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

            {/* АРХИВ СМЕН */}
            <div className="bg-[#111827]/90 backdrop-blur-xl border border-amber-500/20 p-5 rounded-3xl shadow-2xl">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-3">📊 Архив отработанных смен</h3>
              {shiftHistory.length === 0 ? <p className="text-xs text-slate-500">Архив пуст</p> : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {shiftHistory.map(sh => (
                    <div key={sh.id} className="bg-[#0B0F19] border border-slate-800 p-3 rounded-2xl flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-slate-100">{sh.name}</span> <span className="text-amber-400 font-semibold">({sh.projectName || 'Объект'})</span>
                        <div className="text-[11px] text-slate-400">{sh.date} • 📍 {sh.address}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-amber-400 font-bold text-sm">{formatTime(sh.totalTime)}</span>
                        <button onClick={() => deleteItem('shift_history', sh.id)} className="text-slate-500 hover:text-rose-400">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* МАТЕРИАЛЫ И ОБРАЩЕНИЯ */}
            <div className="grid md:grid-cols-2 gap-3">
              <div className="bg-[#111827]/90 backdrop-blur-xl border border-amber-500/20 p-4 rounded-3xl shadow-2xl">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-3">📦 Заказы материалов</h3>
                {materials.length === 0 ? <p className="text-xs text-slate-500">Заказов нет</p> : (
                  <div className="space-y-2">
                    {materials.map(m => (
                      <div key={m.id} className="bg-[#0B0F19] border border-slate-800 p-2.5 rounded-2xl text-xs space-y-1">
                        <div className="flex justify-between font-semibold">
                          <span className="text-slate-100">{m.name} ({m.qty})</span>
                          <button onClick={() => deleteItem('materials', m.id)} className="text-slate-500 hover:text-rose-400">✕</button>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-400">От: {m.user}</span>
                          <select value={m.status} onChange={e => updateMaterialStatus(m.id, e.target.value)} className="bg-slate-900 border border-slate-800 rounded-xl px-2 py-0.5 text-amber-400 font-semibold">
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

              <div className="bg-[#111827]/90 backdrop-blur-xl border border-amber-500/20 p-4 rounded-3xl shadow-2xl">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-3">💬 Обращения сотрудников</h3>
                {issues.length === 0 ? <p className="text-xs text-slate-500">Обращений нет</p> : (
                  <div className="space-y-2">
                    {issues.map(i => (
                      <div key={i.id} className="bg-[#0B0F19] border border-slate-800 p-2.5 rounded-2xl text-xs space-y-1">
                        <div className="flex justify-between font-semibold">
                          <span className="text-slate-100">{i.user}: {i.text}</span>
                          <button onClick={() => deleteItem('issues', i.id)} className="text-slate-500 hover:text-rose-400">✕</button>
                        </div>
                        <div className="flex justify-end">
                          <select value={i.status} onChange={e => updateIssueStatus(i.id, e.target.value)} className="bg-slate-900 border border-slate-800 rounded-xl px-2 py-0.5 text-amber-400 font-semibold text-[11px]">
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
                    <div key={e.id} className="bg-[#0B0F19] p-2.5 rounded-2xl text-xs flex justify-between items-center border border-rose-500/20">
                      <div><span className="font-bold text-rose-400">{e.user}:</span> <span className="text-slate-100">{e.text}</span></div>
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
