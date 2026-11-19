import { COUNTRIES, type Report, type Teacher } from '@dini/core'
import { MutationCache, QueryCache, QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { KeyValueStorage } from './api'
import type { BookingDraft, TeacherFilters } from './logic'
import type { Account, DiniApi, OAuthProvider, Place, TeacherApplication } from './supabase/api'

type Session = {
  api: DiniApi
  /** undefined pendant le chargement, null si personne n'est connecté. */
  account: Account | null | undefined
  place: Place
  setPlace: (p: Place) => void
  error: string | null
  clearError: () => void
}
const Ctx = createContext<Session | null>(null)

const PLACE_KEY = 'dini-place'

/** Pays et fuseau déduits de l'appareil, parmi les pays ouverts ; France par défaut. */
export function detectPlace(): Place {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  const c = COUNTRIES.find((x) => x.timezones.some((t) => t.id === tz))
  return c ? { country: c.code, timezone: tz } : { country: 'FR', timezone: 'Europe/Paris' }
}

export function DiniProvider({ api, storage, children }: { api: DiniApi; storage: KeyValueStorage; children: ReactNode }) {
  // Dernière erreur de chargement, affichée par l'application (réseau coupé, accès refusé…).
  // Les erreurs d'écriture sont montrées par l'écran qui les déclenche, avec un message adapté.
  const [error, setError] = useState<string | null>(null)
  const [client] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, retry: false } },
    queryCache: new QueryCache({ onError: (e) => setError(e.message), onSuccess: () => setError(null) }),
    mutationCache: new MutationCache({ onSuccess: () => setError(null) }),
  }))
  return (
    <QueryClientProvider client={client}>
      <SessionProvider api={api} storage={storage} error={error} clearError={() => setError(null)}>{children}</SessionProvider>
    </QueryClientProvider>
  )
}

function SessionProvider({ api, storage, error, clearError, children }: { api: DiniApi; storage: KeyValueStorage; error: string | null; clearError: () => void; children: ReactNode }) {
  const qc = useQueryClient()
  const account = useQuery({ queryKey: ['account'], queryFn: () => api.getAccount(), staleTime: Infinity })
  useEffect(() => api.onAuthChange(() => { qc.removeQueries({ predicate: (q) => q.queryKey[0] !== 'account' }); qc.invalidateQueries({ queryKey: ['account'] }) }), [api, qc])

  const [place, setPlaceState] = useState<Place>(detectPlace)
  useEffect(() => {
    let live = true
    Promise.resolve(storage.getItem(PLACE_KEY)).then((raw) => {
      if (!live || !raw) return
      try { setPlaceState(JSON.parse(raw) as Place) } catch { /* préférence illisible : on garde la détection */ }
    })
    return () => { live = false }
  }, [storage])
  useEffect(() => { api.setPlace(place) }, [api, place])

  // Un parent connecté : le pays de sa famille fait foi.
  const uid = account.data?.userId
  const family = useQuery({ queryKey: ['family', uid], queryFn: () => api.getFamily(), enabled: account.data?.role === 'family' })
  const famPlace = family.data && { country: family.data.family.country, timezone: family.data.family.timezone }
  useEffect(() => {
    if (famPlace) setPlaceState((p) => (p.country === famPlace.country && p.timezone === famPlace.timezone ? p : famPlace))
  }, [famPlace?.country, famPlace?.timezone]) // eslint-disable-line react-hooks/exhaustive-deps

  const setPlace = useCallback((p: Place) => {
    setPlaceState(p)
    void storage.setItem(PLACE_KEY, JSON.stringify(p))
    if (account.data?.role === 'family') void api.setResidence(p.country, p.timezone).then(() => qc.invalidateQueries())
  }, [api, storage, qc, account.data?.role])

  const value = useMemo(() => ({ api, account: account.isPending ? undefined : account.data ?? null, place, setPlace, error, clearError }),
    [api, account.isPending, account.data, place, setPlace, error, clearError])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useDini() {
  const s = useContext(Ctx)
  if (!s) throw new Error('useDini doit être utilisé dans <DiniProvider>.')
  return s
}

export const useAccount = () => useDini().account
export function usePlace() {
  const { place, setPlace } = useDini()
  return { place, setPlace }
}

// Catalogue ---------------------------------------------------------------------------

export function useTeachers(filters: TeacherFilters) {
  const { api, place } = useDini()
  return useQuery({ queryKey: ['teachers', place, filters], queryFn: () => api.listTeachers(place, filters), placeholderData: (prev) => prev })
}

export function useTeacher(id: string) {
  const { api, place } = useDini()
  return useQuery({ queryKey: ['teacher', place, id], queryFn: () => api.getTeacher(place, id) })
}

export function useSlots(teacherId: string, weekOffset: number) {
  const { api } = useDini()
  return useQuery({ queryKey: ['slots', teacherId, weekOffset], queryFn: () => api.getSlots(teacherId, weekOffset) })
}

// Famille -------------------------------------------------------------------------------

export function useFamily() {
  const { api, account } = useDini()
  return useQuery({ queryKey: ['family', account?.userId], queryFn: () => api.getFamily(), enabled: !!account })
}

export function useQuote(teacherId: string, learnerId: string | undefined) {
  const { api, account } = useDini()
  return useQuery({ queryKey: ['quote', account?.userId, teacherId, learnerId], queryFn: () => api.quote(teacherId, learnerId!), enabled: !!account && !!learnerId })
}

export function useDashboard() {
  const { api, account } = useDini()
  return useQuery({ queryKey: ['dashboard', account?.userId], queryFn: () => api.getDashboard(), enabled: !!account })
}

/** Suit un paiement Bictorys toutes les 3 secondes tant qu'il est en attente (le webhook décide de l'issue). */
export function usePaymentStatus(paymentId: string | null | undefined) {
  const { api, account } = useDini()
  return useQuery({
    queryKey: ['payment', paymentId],
    queryFn: () => api.paymentStatus(paymentId!),
    enabled: !!account && !!paymentId,
    staleTime: 0,
    refetchInterval: (q) => (q.state.data?.status === 'pending' || !q.state.data ? 3000 : false),
  })
}

export function useBookingDetails(id: string) {
  const { api, account } = useDini()
  return useQuery({ queryKey: ['booking', id], queryFn: () => api.getBooking(id), enabled: !!account })
}

/** Toute écriture invalide l'ensemble du cache : simple et sûr tant que les volumes restent petits. */
function useWrite<A, R>(fn: (api: DiniApi, arg: A) => Promise<R>) {
  const { api } = useDini()
  const qc = useQueryClient()
  return useMutation({ mutationFn: (arg: A) => fn(api, arg), onSettled: () => qc.invalidateQueries() })
}

export const useCreateBooking = () => useWrite((api, draft: BookingDraft) => api.createBooking(draft))
export const useStartPayment = () => useWrite((api, a: { paymentId: string; returnUrl?: string }) => api.startPayment(a.paymentId, a.returnUrl))
export const useCancelBooking = () => useWrite((api, id: string) => api.cancelBooking(id))
export const useDisputeBooking = () => useWrite((api, id: string) => api.disputeBooking(id))
export const useAddLearner = () => useWrite((api, a: { name: string; birthYear: number }) => api.addLearner(a.name, a.birthYear))

// Connexion -----------------------------------------------------------------------------

export const useSignIn = () => useWrite((api, a: { email: string; password: string }) => api.signIn(a.email, a.password))
export const useSignUp = () => useWrite((api, a: { name?: string; email: string; password: string; asTeacher: boolean; redirectTo?: string }) => api.signUp(a))
export const useSignOut = () => useWrite((api, _: void) => api.signOut())
export const useUpdateName = () => useWrite((api, name: string) => api.updateName(name))
export const useUploadTeacherMedia = () => useWrite((api, a: { kind: 'photo' | 'video'; file: Blob; contentType: string }) => api.uploadTeacherMedia(a.kind, a.file, a.contentType))
export const useRemoveTeacherMedia = () => useWrite((api, kind: 'photo' | 'video') => api.removeTeacherMedia(kind))
export const useSendPasswordReset = () => useWrite((api, a: { email: string; redirectTo: string }) => api.sendPasswordReset(a.email, a.redirectTo))
export const useUpdatePassword = () => useWrite((api, password: string) => api.updatePassword(password))
/** Fournisseurs de connexion activés (Google, Apple), lus une fois par session. */
export function useAuthProviders() {
  const { api } = useDini()
  return useQuery({ queryKey: ['auth-providers'], queryFn: () => api.authProviders(), staleTime: Infinity })
}

export const useOAuthUrl = () => useMutation({
  mutationFn: (a: { api: DiniApi; provider: OAuthProvider; redirectTo: string; asTeacher?: boolean }) => a.api.oauthUrl(a.provider, a.redirectTo, a.asTeacher),
})

// Espace enseignant -------------------------------------------------------------------------

export function useMyTeacher() {
  const { api, account } = useDini()
  return useQuery({ queryKey: ['my-teacher', account?.userId], queryFn: () => api.getMyTeacher(), enabled: !!account })
}

export function useAgenda() {
  const { api, account } = useDini()
  return useQuery({ queryKey: ['agenda', account?.userId], queryFn: () => api.getAgenda(), enabled: !!account })
}

export function useEarnings() {
  const { api, account } = useDini()
  return useQuery({ queryKey: ['earnings', account?.userId], queryFn: () => api.getEarnings(), enabled: !!account })
}

export const useStartApplication = () => useWrite((api, _: void) => api.startApplication())
export const useSaveApplication = () => useWrite((api, input: TeacherApplication) => api.saveApplication(input))
export const useSubmitApplication = () => useWrite((api, _: void) => api.submitApplication())
export const useSetAvailability = () => useWrite((api, rules: Teacher['availability']) => api.setAvailability(rules))
export const useDeliverSession = () => useWrite((api, a: { id: string; report: Report }) => api.deliverSession(a.id, a.report))
export const useMarkMissed = () => useWrite((api, id: string) => api.markMissed(id))
export const useJoinSession = () => useMutation({ mutationFn: (a: { api: DiniApi; bookingId: string }) => a.api.joinSession(a.bookingId) })

// Modération ------------------------------------------------------------------------------

export function useApplications() {
  const { api, account } = useDini()
  return useQuery({ queryKey: ['applications'], queryFn: () => api.listApplications(), enabled: account?.role === 'moderator' || account?.role === 'admin' })
}

export const useReviewApplication = () => useWrite((api, a: Parameters<DiniApi['reviewApplication']>[0]) => api.reviewApplication(a))

export function useCredentialsToReview() {
  const { api, account } = useDini()
  return useQuery({ queryKey: ['credentials-to-review'], queryFn: () => api.listCredentialsToReview(), enabled: account?.role === 'moderator' || account?.role === 'admin' })
}

export const useReviewCredential = () => useWrite((api, a: { id: number; approve: boolean }) => api.reviewCredential(a))
