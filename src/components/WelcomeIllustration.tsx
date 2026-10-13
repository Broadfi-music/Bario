// Original vector artwork; the reference screenshots are not embedded in the app.
export function WelcomeIllustration({ step }: { step: number }) {
  return (
    <svg viewBox="0 0 600 480" className="welcome-art" role="img" aria-label={[
      "A renter holding the keys to a new home",
      "A property professional checking a verified home",
      "A renter relaxing at home after finding a place",
    ][step]}>
      <rect x="0" y="304" width="600" height="108" className="art-green" />
      {step === 0 && <>
        <path d="M386 142 477 73 566 142v175H386Z" className="art-mist" />
        <path d="m370 146 107-87 108 87" className="art-outline" />
        <path d="M465 218h51v99h-51z" className="art-lime" />
        <path d="M405 164h36v36h-36zM523 164h26v36h-26z" className="art-paper" />
        <path d="M219 263 204 447h51l34-147 19 147h53l-11-189Z" className="art-forest" />
        <path d="m204 447-11 17h64v-17m49 0 3 17h69l-24-17" className="art-ink" />
        <path d="M246 135c-42 7-83 24-105 68-20 38 9 76 52 82l25-42-27-13 44-45-6 93h121l-10-76 66-8-4-44-87 18-22-33Z" className="art-green" />
        <path d="m260 134 31 51 18-45" className="art-paper" />
        <path d="M267 112v30l24 16 16-24-11-30" className="art-skin" />
        <path d="M261 75c-6-26 11-47 36-41 26 6 31 30 24 52l-4 31c-5 27-45 28-50-2Z" className="art-skin" />
        <path d="M261 78c-17-48 28-62 51-40 9 9 13 25 9 43l-9-8-4-25c-15 12-29 15-47 12Z" className="art-ink" />
        <path d="M276 99h22c-2 15-18 16-22 0" className="art-paper" />
        <path d="m271 85 8-2m15 0 8 2M292 83l-3 10" className="art-fine" />
        <path d="M402 151c12-12 23-19 31-12 9 8-1 27-28 31Z" className="art-skin" />
        <path d="m197 253 26-4 16 16-8 20-21-11Z" className="art-skin" />
        <path d="M238 251h110v22H238z" className="art-lime" />
        <path d="m246 167-12 79m-20-60-14 18m65 83-20 140m73-140 18 140" className="art-outline" />
        <circle cx="434" cy="130" r="16" className="art-key" />
        <path d="m445 143 28 28m-11-11 9-9m-2 16 9-9" className="art-key" />
      </>}
      {step === 1 && <>
        <path d="M347 205h105c29 0 39 19 33 46l-32 126H320Z" className="art-forest" />
        <path d="M391 359v86m-49 4h95m-46-8-60 16m60-16 60 16" className="art-outline" />
        <circle cx="332" cy="460" r="7" className="art-ink" /><circle cx="451" cy="460" r="7" className="art-ink" />
        <path d="m311 274-90 72-67 70 37 26 88-74 87-41 3 64-79 49 28 26 105-65-2-103Z" className="art-forest" />
        <path d="m152 408-30 13 57 41 21-28m87-1-28 19 40 26 28-26" className="art-ink" />
        <path d="m322 141-54 26-35-42-31 20 30 83 60 3-10 49h136l-10-69c-7-52-33-76-59- seventy" className="art-green" />
        <path d="M321 145c-40 8-49 33-39 67l-5 75h145l-18-86c-8-40-37-65-65-57Z" className="art-green" />
        <path d="m323 154-8 79h51l-18-83" className="art-paper" />
        <path d="M323 126v31l24 9 13-20-12-27" className="art-skin" />
        <path d="M310 86c-7-22 7-35 25-26 16-17 43-2 42 20l-4 39c-8 31-45 33-55 4Z" className="art-skin" />
        <path d="M308 101c-23-3-21-25-8-28-8-24 16-36 30-19 19-22 47-4 43 22l14 8c15 24-19 31-22 27l-7-24-26 5-6-10-3 19Z" className="art-forest" />
        <path d="m343 108 9 2m-11 12 16-1" className="art-fine" />
        <path d="M203 146c-16-16-37-31-28-40 7-7 22 13 29 16-16-21-20-40-11-41 8-1 16 22 24 33-8-28-7-39 2-38 10 1 10 26 16 45 16-20 31-18 27-7-5 18-13 37-30 42Z" className="art-skin" />
        <path d="M164 209h103l16 70H183Z" className="art-mist" />
        <path d="M170 212h91l16 65H189Z" className="art-paper" />
        <path d="M140 279h348v13H140Z" className="art-lime" />
        <path d="m165 293-28 166m323-166 27 166m-155-154-91 68m116-43-61 64" className="art-outline" />
        <path d="m212 241 8-8 8 8-8 8Z" className="art-green" />
        <circle cx="441" cy="136" r="39" className="art-lime" />
        <path d="m423 137 12 12 25-28" className="art-outline" />
      </>}
      {step === 2 && <>
        <path d="M88 297c-7-43 34-73 73-47l42 65h240c67 0 80 104 20 116H150c-66 0-90-53-62-89Z" className="art-lime" />
        <path d="m156 427-17 43m285-43 17 43" className="art-outline" />
        <path d="M249 299c52-4 90-1 121 21l121 58-16 38-139-42-79 0-55-33Z" className="art-forest" />
        <path d="m475 377 28 7 50 43-20 23-65-35Z" className="art-ink" />
        <path d="m252 339 86 38 98 55-21 31-117-50-94-35Z" className="art-forest" />
        <path d="m414 429 30 17 32 18-11 13h-65Z" className="art-ink" />
        <path d="M173 175c-33 21-53 70-48 129l44 42 117-16-17-100 51-33-16-33-73 25Z" className="art-green" />
        <path d="m190 193 15 80h35l-10-82" className="art-forest" />
        <path d="M196 156v35l27 19 17-23-10-35" className="art-skin" />
        <path d="M180 103c-6-21 18-40 41-24 20 14 28 43 16 69-10 19-41 13-50-2Z" className="art-skin" />
        <path d="M182 100c-21 20-18 46-38 61-13 10-45 37-60 16-22-30 31-45 46-67 11-17 12-45 39-37 28-22 52-8 55 16l-34 10Z" className="art-forest" />
        <circle cx="161" cy="63" r="20" className="art-forest" />
        <path d="m210 119 9 1m-8 16 13-3" className="art-fine" />
        <path d="m312 170 10-49c3-12 21-15 27-2l-5 56-21 20Z" className="art-skin" />
        <path d="M327 91h51l-7 54c-3 17-36 17-40 0Z" className="art-lime" />
        <ellipse cx="352" cy="91" rx="26" ry="8" className="art-lime" />
        <ellipse cx="352" cy="94" rx="20" ry="5" className="art-forest" />
        <path d="M384 223h104l-30 90H352Z" className="art-paper" />
        <path d="m386 223 104-1-29 91H343" className="art-outline" />
        <path d="M268 282c24-7 40-1 47 13l-35 18-23-14" className="art-skin" />
        <path d="m151 253 9 49 86 8m93 38 72 27" className="art-outline" />
        <path d="m420 258 16-10 15 10v19h-31Z" className="art-mist" />
      </>}
    </svg>
  );
}