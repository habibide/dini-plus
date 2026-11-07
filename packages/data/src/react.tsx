import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { DiniApi, BookingDraft, TeacherFilters } from './api'
import type { Report } from '@dini/core'

type Session = { api: DiniApi; familyId: string; setFamilyId: (id: string) => void }
const Ctx = createContext<Session | null>(null)

export function DiniProvider({ api, initialFamilyId = 'fam-diop', children }: { api: DiniApi; initialFamilyId?: string; children: ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: false } } }))
  const [familyId, setFamilyId] = useState(initialFamilyId)
  const value = useMemo(() => ({ api, familyId, setFamilyId }), [api, familyId])
  return (
    <QueryClientProvider client={client}>
      <Ctx.Provider value={value}>{children}</Ctx.Provider>
    </QueryClientProvider>
  )
}

export function useDini() {
  const s = useContext(Ctx)
  if (!s) throw new Error('useDini doit être utilisé dans <DiniProvider>.')
  return s
}

export function useFamily() {
  const { api, familyId } = useDini()
  return useQuery({ queryKey: ['family', familyId], queryFn: () => api.getFamily(familyId) })
}

export function useTeachers(filters: TeacherFilters) {
  const { api, familyId } = useDini()
  return useQuery({ queryKey: ['teachers', familyId, filters], queryFn: () => api.listTeachers(familyId, filters), placeholderData: (prev) => prev })
}

export function useTeacher(id: string) {
  const { api, familyId } = useDini()
  return useQuery({ queryKey: ['teacher', familyId, id], queryFn: () => api.getTeacher(familyId, id) })
}

export function useSlots(teacherId: string, weekOffset: number) {
  const { api } = useDini()
  return useQuery({ queryKey: ['slots', teacherId, weekOffset], queryFn: () => api.getSlots(teacherId, weekOffset) })
}

export function useQuote(teacherId: string, learnerId: string | undefined) {
  const { api, familyId } = useDini()
  return useQuery({ queryKey: ['quote', familyId, teacherId, learnerId], queryFn: () => api.quote(familyId, teacherId, learnerId!), enabled: !!learnerId })
}

export function useDashboard() {
  const { api, familyId } = useDini()
  return useQuery({ queryKey: ['dashboard', familyId], queryFn: () => api.getDashboard(familyId) })
}

export function useBookingDetails(id: string) {
  const { api } = useDini()
  return useQuery({ queryKey: ['booking', id], queryFn: () => api.getBooking(id) })
}

/** Toute écriture invalide l'ensemble du cache : avec des données fictives, c'est simple et sûr. */
function useWrite<A, R>(fn: (api: DiniApi, familyId: string, arg: A) => Promise<R>) {
  const { api, familyId } = useDini()
  const qc = useQueryClient()
  return useMutation({ mutationFn: (arg: A) => fn(api, familyId, arg), onSettled: () => qc.invalidateQueries() })
}

export const useCreateBooking = () => useWrite((api, _f, draft: BookingDraft) => api.createBooking(draft))
export const useCancelBooking = () => useWrite((api, _f, id: string) => api.cancelBooking(id))
export const useDisputeBooking = () => useWrite((api, _f, id: string) => api.disputeBooking(id))
export const useAddLearner = () => useWrite((api, familyId, a: { name: string; birthYear: number }) => api.addLearner(familyId, a.name, a.birthYear))
export const useSetResidence = () => useWrite((api, familyId, a: { country: 'SN' | 'GM' | 'FR' | 'US' | 'CA'; timezone: string }) => api.setResidence(familyId, a.country, a.timezone))
export const useDeliverBooking = () => useWrite((api, _f, a: { id: string; report: Report }) => api.deliverBooking(a.id, a.report))
export const useAdvanceClock = () => useWrite((api, _f, hours: number) => api.advanceClock(hours))
export const useResetDemo = () => useWrite((api) => api.reset())
