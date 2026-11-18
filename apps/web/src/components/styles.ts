// Classes partagées. Ce module n'est pas un composant client : les pages serveur peuvent l'importer.

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

export const buttonCls = {
  primary: 'inline-flex min-h-[52px] cursor-pointer items-center justify-center gap-2.5 rounded-[14px] border-[1.5px] border-green bg-green px-5 font-semibold text-white transition active:scale-[0.98] hover:border-green2 hover:bg-green2 disabled:cursor-not-allowed disabled:opacity-40',
  ghost: 'inline-flex min-h-[52px] cursor-pointer items-center justify-center gap-2.5 rounded-[14px] border-[1.5px] border-[#d6d2c7] bg-white px-5 font-semibold text-ink transition active:scale-[0.98] hover:border-green disabled:cursor-not-allowed disabled:opacity-40',
  sand: 'inline-flex min-h-[52px] cursor-pointer items-center justify-center gap-2.5 rounded-[14px] bg-white px-6 font-semibold text-green2 transition active:scale-[0.98] hover:bg-soft',
}
