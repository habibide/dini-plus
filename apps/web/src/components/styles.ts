// Classes partagées. Ce module n'est pas un composant client : les pages serveur peuvent l'importer.

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

export const buttonCls = {
  primary: 'inline-flex min-h-12 cursor-pointer items-center justify-center rounded-sm bg-green px-5 font-semibold text-white hover:bg-green2 disabled:cursor-not-allowed disabled:bg-[#a9b4ae]',
  ghost: 'inline-flex min-h-12 cursor-pointer items-center justify-center rounded-sm border border-line bg-white px-5 font-semibold hover:border-green disabled:cursor-not-allowed disabled:text-muted',
  sand: 'inline-flex min-h-12 cursor-pointer items-center justify-center rounded-sm bg-sand px-6 font-semibold text-green hover:bg-[#efe5cc]',
}
