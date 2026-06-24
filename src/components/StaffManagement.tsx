import { useState, useEffect } from 'react'
import { Users, UserPlus, Key, Trash2, ShieldCheck, DollarSign } from 'lucide-react'
import { useAuthSession } from '../hooks/useAuthSession'
import { collection, doc, setDoc, getDocs, deleteDoc, updateDoc } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useToast } from './ToastProvider'
import { hashStaffPin } from '../utils/pinSecurity'

type StaffMember = {
  uid: string
  email: string
  role: 'manager' | 'cashier'
  name: string
  pinHash?: string
  baseSalary?: number
  advances?: number
  commissionRate?: number
  commissionEarned?: number
}

function isStaffRole(value: string): value is StaffMember['role'] {
  return value === 'manager' || value === 'cashier'
}

export function StaffManagement() {
  const { tenantId, role } = useAuthSession()
  const toast = useToast()
  
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)

  // Form State
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [staffRole, setStaffRole] = useState<'manager'|'cashier'>('cashier')

  useEffect(() => {
    if (role !== 'owner' || !tenantId) {
      setLoading(false)
      return
    }

    const fetchStaff = async () => {
      try {
        const staffRef = collection(db, `users/${tenantId}/staff`)
        const snapshot = await getDocs(staffRef)
        const staffData = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as StaffMember))
        setStaff(staffData)
      } catch (err) {
        console.error('Failed to load staff:', err)
      } finally {
        setLoading(false)
      }
    }
    
    fetchStaff()
  }, [tenantId, role])

  const generateInviteLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !name || !pin || !tenantId) return

    try {
      const newStaffId = email.toLowerCase().trim()
      const pinHash = await hashStaffPin(tenantId, pin)
      await setDoc(doc(db, `users/${tenantId}/staff`, newStaffId), {
        email: newStaffId,
        name,
        role: staffRole,
        pinHash,
        baseSalary: 0,
        advances: 0,
        createdAt: new Date().toISOString()
      })
      
      setStaff(prev => [...prev, { uid: newStaffId, email: newStaffId, name, role: staffRole, pinHash, baseSalary: 0, advances: 0 }])
      toast('Staff Added', `Successfully added ${name}`, 'success')
      setEmail('')
      setName('')
      setPin('')
    } catch (error) {
      console.error(error)
      toast('Error', 'Failed to add staff', 'error')
    }
  }

  const removeStaff = async (uid: string) => {
    if (!tenantId) return
    if (!window.confirm('Are you sure you want to remove this staff member?')) return
    try {
      await deleteDoc(doc(db, `users/${tenantId}/staff`, uid))
      setStaff(prev => prev.filter(s => s.uid !== uid))
      toast('Staff Removed', 'Access revoked successfully.', 'success')
    } catch (error) {
      console.error(error)
      toast('Error', 'Failed to remove staff', 'error')
    }
  }

  const updatePayroll = async (s: StaffMember) => {
    if (!tenantId) return
    const newSalary = window.prompt(`Update Base Salary for ${s.name}:`, s.baseSalary?.toString() || '0')
    if (newSalary === null) return
    const newAdvances = window.prompt(`Update Advances for ${s.name}:`, s.advances?.toString() || '0')
    if (newAdvances === null) return
    
    try {
      await updateDoc(doc(db, `users/${tenantId}/staff`, s.uid), {
        baseSalary: parseFloat(newSalary) || 0,
        advances: parseFloat(newAdvances) || 0
      })
      setStaff(prev => prev.map(staff => staff.uid === s.uid ? { ...staff, baseSalary: parseFloat(newSalary) || 0, advances: parseFloat(newAdvances) || 0 } : staff))
      toast('Payroll Updated', `Saved payroll data for ${s.name}`, 'success')
    } catch (error) {
      console.error(error)
      toast('Error', 'Failed to update payroll', 'error')
    }
  }

  if (role !== 'owner') {
    return (
      <div className="p-8 text-center text-ink-soft">
        <ShieldCheck className="mx-auto mb-4 opacity-50" size={48} />
        <p>Only store owners can manage staff.</p>
      </div>
    )
  }

  return (
    <div className="glass bg-surface-strong/60 backdrop-blur-2xl rounded-3xl p-6 xl:p-8 shadow-[0_8px_40px_rgb(0,0,0,0.08)] border border-line/40 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-[80px] pointer-events-none -z-10"></div>
      
      <div className="flex items-center gap-3 mb-8 pb-6 border-b border-line/30 relative z-10">
        <div className="p-2.5 rounded-xl bg-accent/10 text-accent">
          <Users size={24} />
        </div>
        <div>
          <h2 className="font-heading text-2xl font-black text-ink">Staff Management</h2>
          <p className="text-xs text-ink-soft font-bold mt-1">Manage team access and roles.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 relative z-10">
        <div>
          <h3 className="font-heading text-lg font-black mb-5 flex items-center gap-2">
            <UserPlus size={18} className="text-accent" /> Invite New Staff
          </h3>
          <form onSubmit={generateInviteLink} className="space-y-4">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-ink-soft mb-1.5">Full Name</label>
              <input 
                required 
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-surface border border-line rounded-xl px-4 py-3 font-bold text-ink shadow-inner focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all" 
                placeholder="e.g. Rahim"
              />
            </div>
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-ink-soft mb-1.5">Email Address</label>
              <input 
                required 
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-surface border border-line rounded-xl px-4 py-3 font-bold text-ink shadow-inner focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all" 
                placeholder="staff@example.com"
              />
            </div>
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-ink-soft mb-1.5">Access PIN (4 digits)</label>
              <input 
                required 
                type="text"
                maxLength={4}
                pattern="\d{4}"
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-surface border border-line rounded-xl px-4 py-3 font-bold text-ink shadow-inner focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all" 
                placeholder="e.g. 1234"
              />
            </div>
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-ink-soft mb-1.5">Role</label>
              <select 
                value={staffRole}
                onChange={(e) => {
                  if (isStaffRole(e.target.value)) {
                    setStaffRole(e.target.value)
                  }
                }}
                className="w-full bg-surface border border-line rounded-xl px-4 py-3 font-bold text-ink shadow-inner focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all appearance-none"
              >
                <option value="cashier">Cashier (POS & Sales only)</option>
                <option value="manager">Manager (Inventory & Reports)</option>
              </select>
            </div>
            <button type="submit" className="w-full py-4 mt-2 bg-accent text-surface rounded-xl font-black text-sm shadow-[0_4px_20px_rgba(var(--color-accent),0.3)] hover:shadow-[0_8px_30px_rgba(var(--color-accent),0.4)] hover:bg-accent/90 transition-all hover:-translate-y-0.5 active:scale-95">
              Add Staff & Generate Code
            </button>
          </form>

          <div className="mt-8 p-5 bg-accent/5 backdrop-blur-md border border-accent/20 rounded-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-accent/10 rounded-full blur-xl group-hover:bg-accent/20 transition-all pointer-events-none"></div>
            <p className="text-sm text-accent font-medium mb-1 flex items-center gap-2">
              <Key size={16} /> Your Store Code
            </p>
            <code className="block bg-surface p-2 rounded-lg text-ink font-mono mt-2 break-all">
              {tenantId}
            </code>
            <p className="text-xs text-ink-soft mt-2">
              Staff must enter this code when signing up to join your store.
            </p>
          </div>
        </div>

        <div>
          <h3 className="font-heading text-lg font-black mb-5">Current Staff</h3>
          {loading ? (
            <div className="animate-pulse flex space-x-4">
              <div className="flex-1 space-y-4 py-1">
                <div className="h-10 bg-line/50 rounded"></div>
                <div className="h-10 bg-line/50 rounded"></div>
              </div>
            </div>
          ) : staff.length === 0 ? (
            <p className="text-sm text-ink-soft border border-dashed border-line rounded-xl p-8 text-center">
              No staff members added yet.
            </p>
          ) : (
            <div className="space-y-3">
              {staff.map(s => (
                <div key={s.uid} className="group flex items-center justify-between p-4 border border-line/40 rounded-2xl bg-surface/80 backdrop-blur-md shadow-sm transition-all hover:-translate-y-1 hover:shadow-[0_4px_20px_rgb(0,0,0,0.04)] hover:border-accent/40">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-surface-strong flex items-center justify-center font-heading text-lg font-black text-ink shrink-0 border border-line/50 group-hover:bg-accent/10 group-hover:text-accent group-hover:border-accent/30 transition-colors">
                      {s.name.substring(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-ink leading-tight">{s.name}</p>
                      <p className="text-xs font-medium text-ink-soft">{s.email}</p>
                      <div className="flex gap-2 items-center mt-1.5">
                        <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${s.role === 'manager' ? 'bg-focus/10 text-focus border border-focus/20' : 'bg-surface-strong text-ink-soft border border-line/50'}`}>
                          {s.role}
                        </span>
                        <span className="text-[10px] text-ink-soft font-bold">
                          Salary: {s.baseSalary || 0} | Advances: <span className="text-danger">{s.advances || 0}</span> | 
                          Commission: <span className="text-success ml-1">{s.commissionEarned || 0} ({s.commissionRate || 5}%)</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => updatePayroll(s)}
                      className="p-2.5 text-accent/70 border border-transparent hover:border-accent/30 hover:text-accent hover:bg-accent/10 rounded-xl transition-all shadow-sm active:scale-95"
                      title="Update Payroll"
                    >
                      <DollarSign size={16} />
                    </button>
                    <button 
                      onClick={() => removeStaff(s.uid)}
                      className="p-2.5 text-danger/70 border border-transparent hover:border-danger/30 hover:text-danger hover:bg-danger/10 rounded-xl transition-all shadow-sm active:scale-95"
                      title="Remove Staff"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
