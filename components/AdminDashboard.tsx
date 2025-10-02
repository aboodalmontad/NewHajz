import React, { useState } from 'react';
import { useQueueSystem } from '../context/QueueContext';
import { EmployeeStatus, Window } from '../types';
import { Button } from './shared/Button';
import { Card } from './shared/Card';
import { Modal } from './shared/Modal';

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactElement }> = ({ title, value, icon }) => (
    <Card className="flex items-center p-6 bg-slate-800 shadow-lg">
        <div className="bg-sky-500/20 text-sky-400 p-4 rounded-full">{icon}</div>
        <div className="mr-4">
            <p className="text-slate-400 text-sm">{title}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
        </div>
    </Card>
);

const AdminDashboard: React.FC = () => {
    const { 
        state,
        getAverageWaitTime, 
        getAverageServiceTime,
        addEmployee,
        removeEmployee,
        addWindow,
        removeWindow,
        updateWindowTask
    } = useQueueSystem();

    const [isEmployeeModalOpen, setEmployeeModalOpen] = useState(false);
    const [isWindowModalOpen, setWindowModalOpen] = useState(false);
    const [newEmployeeName, setNewEmployeeName] = useState('');
    const [newEmployeeUsername, setNewEmployeeUsername] = useState('');
    const [newEmployeePassword, setNewEmployeePassword] = useState('');
    const [newWindowName, setNewWindowName] = useState('');
    const [newWindowTask, setNewWindowTask] = useState('');
    const [editingWindow, setEditingWindow] = useState<Window | null>(null);

    const handleAddEmployee = () => {
        if (newEmployeeName.trim() && newEmployeeUsername.trim() && newEmployeePassword.trim()) {
            addEmployee(newEmployeeName.trim(), newEmployeeUsername.trim(), newEmployeePassword.trim());
            setNewEmployeeName('');
            setNewEmployeeUsername('');
            setNewEmployeePassword('');
            setEmployeeModalOpen(false);
        }
    };
    
    const handleAddWindow = () => {
        if(newWindowName.trim()) {
            addWindow(newWindowName.trim(), newWindowTask.trim());
            setNewWindowName('');
            setNewWindowTask('');
            setWindowModalOpen(false);
        }
    };

    const handleUpdateWindow = () => {
        if(editingWindow && newWindowTask.trim()) {
            updateWindowTask(editingWindow.id, newWindowTask.trim());
            setEditingWindow(null);
            setNewWindowTask('');
        }
    }

    const openEditModal = (window: Window) => {
        setEditingWindow(window);
        setNewWindowTask(window.customTask || '');
    };

    const closeEditModal = () => {
        setEditingWindow(null);
        setNewWindowTask('');
    };
    
    const { queue, employees, windows } = state;
    const avgWaitTime = getAverageWaitTime().toFixed(1);
    const avgServiceTime = getAverageServiceTime().toFixed(1);
    const availableEmployees = employees.filter(e => e.status === EmployeeStatus.Available).length;

    const Icons = {
        Queue: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
        WaitTime: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
        ServiceTime: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>,
        Available: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    }

    return (
        <div className="space-y-8">
            <h2 className="text-3xl font-bold text-white">لوحة تحكم الإدارة</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="عملاء في الانتظار" value={queue.length.toString()} icon={Icons.Queue} />
                <StatCard title="متوسط وقت الانتظار" value={`${avgWaitTime} دقيقة`} icon={Icons.WaitTime} />
                <StatCard title="متوسط وقت الخدمة" value={`${avgServiceTime} دقيقة`} icon={Icons.ServiceTime} />
                <StatCard title="الموظفون المتاحون" value={`${availableEmployees} / ${employees.length}`} icon={Icons.Available} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="bg-slate-800 p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-semibold">الموظفين</h3>
                        <Button onClick={() => setEmployeeModalOpen(true)}>إضافة موظف</Button>
                    </div>
                    <ul className="space-y-3">
                        {employees.map(emp => (
                            <li key={emp.id} className="flex justify-between items-center bg-slate-700 p-3 rounded-md">
                                <div>
                                    <span className="font-medium">{emp.name} <span className="text-slate-400 text-sm">({emp.username})</span></span>
                                    <span className={`mr-3 text-xs font-semibold px-2 py-1 rounded-full ${emp.status === EmployeeStatus.Available ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{emp.status}</span>
                                </div>
                                <div className="flex items-center space-x-4">
                                    <span className="text-sm text-slate-400">خدم: {emp.customersServed}</span>
                                    <Button size="sm" variant="danger" onClick={() => removeEmployee(emp.id)}>&times;</Button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </Card>

                <Card className="bg-slate-800 p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-semibold">الشبابيك</h3>
                        <Button onClick={() => setWindowModalOpen(true)}>إضافة شباك</Button>
                    </div>
                     <ul className="space-y-3">
                        {windows.map(win => (
                            <li key={win.id} className="flex justify-between items-center bg-slate-700 p-3 rounded-md">
                                <div>
                                    <span className="font-medium">{win.name}</span>
                                    <p className="text-sm text-slate-400">{win.customTask || 'لا توجد مهمة محددة'}</p>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Button size="sm" variant="secondary" onClick={() => openEditModal(win)}>تعديل</Button>
                                    <Button size="sm" variant="danger" onClick={() => removeWindow(win.id)}>&times;</Button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </Card>
            </div>

            <Modal isOpen={isEmployeeModalOpen} onClose={() => setEmployeeModalOpen(false)} title="إضافة موظف جديد">
                <div className="space-y-4">
                    <input type="text" value={newEmployeeName} onChange={e => setNewEmployeeName(e.target.value)} placeholder="اسم الموظف الكامل" className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-sky-500 focus:border-sky-500"/>
                    <input type="text" value={newEmployeeUsername} onChange={e => setNewEmployeeUsername(e.target.value)} placeholder="اسم المستخدم (للدخول)" className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-sky-500 focus:border-sky-500"/>
                    <input type="password" value={newEmployeePassword} onChange={e => setNewEmployeePassword(e.target.value)} placeholder="كلمة المرور" className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-sky-500 focus:border-sky-500"/>
                </div>
                <div className="mt-4 flex justify-end space-x-2">
                    <Button variant="secondary" onClick={() => setEmployeeModalOpen(false)}>إلغاء</Button>
                    <Button onClick={handleAddEmployee}>إضافة</Button>
                </div>
            </Modal>
            
            <Modal isOpen={isWindowModalOpen} onClose={() => setWindowModalOpen(false)} title="إضافة شباك جديد">
                <div className="space-y-4">
                    <input type="text" value={newWindowName} onChange={e => setNewWindowName(e.target.value)} placeholder="اسم الشباك (مثال: شباك 5)" className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-sky-500 focus:border-sky-500"/>
                    <input type="text" value={newWindowTask} onChange={e => setNewWindowTask(e.target.value)} placeholder="مهمة مخصصة (اختياري، مثال: خدمات كبار الشخصيات)" className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-sky-500 focus:border-sky-500"/>
                </div>
                <div className="mt-4 flex justify-end space-x-2">
                    <Button variant="secondary" onClick={() => setWindowModalOpen(false)}>إلغاء</Button>
                    <Button onClick={handleAddWindow}>إضافة</Button>
                </div>
            </Modal>

            <Modal isOpen={!!editingWindow} onClose={closeEditModal} title={`تعديل مهمة ${editingWindow?.name}`}>
                 <input type="text" value={newWindowTask} onChange={e => setNewWindowTask(e.target.value)} placeholder="مهمة مخصصة" className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-sky-500 focus:border-sky-500"/>
                <div className="mt-4 flex justify-end space-x-2">
                    <Button variant="secondary" onClick={closeEditModal}>إلغاء</Button>
                    <Button onClick={handleUpdateWindow}>حفظ التغييرات</Button>
                </div>
            </Modal>

        </div>
    );
};

export default AdminDashboard;
