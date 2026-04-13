export const metadata = { title: 'Size Guide — Vami Clubwear' }

const TOPS = [
  { size: 'XS',        bust: '32"',    waist: '26"',    hip: '36"'   },
  { size: 'S',         bust: '34"',    waist: '28"',    hip: '38"'   },
  { size: 'M',         bust: '36"',    waist: '30"',    hip: '40"'   },
  { size: 'L',         bust: '38"',    waist: '32"',    hip: '42"'   },
  { size: 'XL',        bust: '40"',    waist: '34"',    hip: '44"'   },
  { size: 'XXL',       bust: '42"',    waist: '36"',    hip: '46"'   },
  { size: 'Free Size', bust: '36–40"', waist: '30–34"', hip: '40–44"'},
]

export default function SizingPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-32 pb-10 md:px-8">
      <div className="mb-12">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-primary-light mb-4">Fit Guide</p>
        <h1 className="font-display text-4xl font-bold text-on-background">Size Guide</h1>
        <p className="mt-3 text-sm text-muted">
          All measurements are in inches. Take measurements over light clothing for the best fit.
        </p>
      </div>

      {/* How to measure */}
      <div className="border border-border bg-surface p-6 mb-10 space-y-4">
        <h2 className="font-display text-base font-semibold text-on-background">How to Measure</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Bust',  desc: 'Measure around the fullest part of your chest, keeping the tape parallel to the floor.' },
            { label: 'Waist', desc: 'Measure around your natural waistline — the narrowest part of your torso.' },
            { label: 'Hip',   desc: 'Measure around the fullest part of your hips, about 8 inches below your waist.' },
          ].map(({ label, desc }) => (
            <div key={label}>
              <p className="text-xs font-semibold text-on-background uppercase tracking-widest mb-1">{label}</p>
              <p className="text-xs leading-relaxed text-muted">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Size chart */}
      <div className="mb-10">
        <h2 className="font-display text-xl font-semibold text-on-background mb-5">Size Chart</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {['Size', 'Bust', 'Waist', 'Hip'].map(h => (
                  <th key={h} className="pb-3 text-left text-xs font-semibold uppercase tracking-widest text-muted pr-8">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {TOPS.map(row => (
                <tr key={row.size}>
                  <td className="py-3 font-medium text-on-background pr-8">{row.size}</td>
                  <td className="py-3 text-muted pr-8">{row.bust}</td>
                  <td className="py-3 text-muted pr-8">{row.waist}</td>
                  <td className="py-3 text-muted">{row.hip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="border border-amber-600/20 bg-amber-600/5 p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-400 mb-2">Fit Tip</p>
        <p className="text-sm text-muted leading-relaxed">
          If you are between two sizes, we recommend sizing up for a comfortable, relaxed fit.
          For custom measurements (bridal orders), contact us on WhatsApp with your exact measurements
          and we will tailor the garment to you.
        </p>
      </div>
    </div>
  )
}
