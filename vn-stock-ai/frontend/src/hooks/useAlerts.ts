import { useState, useEffect, useCallback } from 'react'
import { stockApi } from '../services/stockApi'
import toast from 'react-hot-toast'

export function useAlerts() {
  const [alerts, setAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await stockApi.getAlerts()
      setAlerts(Array.isArray(data) ? data : [])
    } catch { setAlerts([]) }
  }, [])

  useEffect(() => { load() }, [load])

  const create = useCallback(async (body: any) => {
    setLoading(true)
    try {
      await stockApi.createAlert(body)
      toast.success('Đã tạo alert!')
      await load()
    } catch { toast.error('Lỗi tạo alert — backend chưa chạy?') }
    finally { setLoading(false) }
  }, [load])

  const remove = useCallback(async (id: string) => {
    try {
      await stockApi.deleteAlert(id)
      toast.success('Đã xóa alert')
      setAlerts(prev => prev.filter(a => a.id !== id))
    } catch { toast.error('Lỗi xóa alert') }
  }, [])

  return { alerts, loading, create, remove, refresh: load }
}

export default useAlerts
