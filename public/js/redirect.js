(async () => {
  const shortCode = new URLSearchParams(location.search).get('c');
  if (!shortCode) return fail('Missing short code.');

  const state = { journeyId: null, token: null, totalSteps: 0, currentStep: 0 };

  const blogContents = {
    1: {
      title: "Instagram से पैसा कमाने का सबसे आसान तरीका (बिना 1 Follower के)",
      author: "Digital Marketing Expert",
      p1: "आजकल हर कोई कहता है कि Instagram से पैसे कमाने के लिए हजारों followers चाहिए, या फिर आपको अपना कोई Product बेचना पड़ेगा। लेकिन सच्चाई इससे बिल्कुल अलग है।",
      p2: "मैंने खुद एक ऐसा System खोजा है जिसमें आपको न अपनी फेस दिखानी पड़ती है, न हजारों followers चाहिए, और न ही कोई Affiliate Marketing करनी पड़ती है।",
      p3: "इस System में आप सिर्फ Instagram की Traffic का इस्तेमाल करके पैसे कमाते हैं। ये कैसे मुमकिन है? आगे के pages में मैंने इसका पूरा तरीका step-by-step explain किया है।",
      p4: "अगर आप भी बिना कोई Investment किये Instagram से Online Earning शुरू करना चाहते हैं, तो नीचे दिए गए बटन पर क्लिक करें।"
    },
    2: {
      title: "बिना Followers, Instagram से Traffic कैसे लाएं?",
      author: "Digital Marketing Expert",
      p1: "जब आपके पास 0 followers होते हैं, तो लोग सोचते हैं कि अब कुछ नहीं हो सकता। लेकिन Instagram का Algorithm आपके followers को नहीं, बल्कि आपके Content को देखता है।",
      p2: "Explore Page और Reels आपका सबसे बड़ा दोस्त हैं। आपको बस कुछ Viral Topics चुनने हैं और उन पर छोटी-छोटी Reels बनानी हैं।",
      p3: "एक बार जब आपकी Reel Viral हो जाती है, तो आपके पास 10k followers की जरूरत नहीं होती। सिर्फ 1 Viral Reel से आपको हजारों की संख्या में Visitors मिल जाते हैं।",
      p4: "अब सवाल ये आता है कि इन Visitors से पैसे कैसे कमाएं, जब आपको कोई Product नहीं बेचना है? इसका जवाब जानने के लिए आगे बढ़ें।"
    },
    3: {
      title: "बिना Product और Affiliate Marketing के Monetization कैसे करें?",
      author: "Digital Marketing Expert",
      p1: "यही वो जगह है जहाँ 99% लोग fail हो जाते हैं। उनके पास Traffic होता है, लेकिन उन्हें पता नहीं होता कि उस ट्रैफिक को पैसों में कैसे बदला जाए।",
      p2: "जब आपके पास Traffic आ जाता है, तो आपको किसी Product की जरूरत नहीं होती। आप सीधे Instagram के बाहर अपनी एक Free Landing Page बनाते हैं।",
      p3: "आप चाहें तो Instagram Pages/Brands को shoutouts बेच सकते हैं, या फिर आप Client Acquisition कर सकते हैं। मैंने अपने Course में ये exact method डाला है।",
      p4: "ये कोई सपना नहीं है, बल्कि एक step-by-step blueprint है जिसे मैंने खुद टेस्ट किया है।"
    },
    4: {
      title: "The Ultimate Blueprint: Instagram Traffic Course",
      author: "Digital Marketing Expert",
      p1: "अगर आपने अभी तक जो पढ़ा है, वो आपको एक direction दे रहा है। लेकिन असली खेल है 'Execution' में। आपको exact script, exact tools और exact process चाहिए।",
      p2: "मैंने अपने सारे experiments और successful methods को मिलाकर एक Exclusive Course तैयार किया है: 'Instagram Traffic Mastery'।",
      p3: "इस Course में आप सीखेंगे: 1. बिना Face दिखाए Viral Content बनाना। 2. 0 followers से Traffic खींचना। 3. बिना Product बेचे पैसे कमाने का exact framework।",
      p4: "ये Course शुरू करने के लिए आपको एक Mobile और Internet के अलावा किसी चीज की जरूरत नहीं है।"
    }
  };

  try {
    const res = await fetch('/api/journey/start', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shortCode })
    });
    const data = await res.json();
    if (!res.ok) return fail(data.error || 'Unable to start.');

    Object.assign(state, { journeyId: data.journeyId, token: data.token,
      totalSteps: data.totalSteps, currentStep: 1 });

    await renderPage(1);
    showPage();
  } catch (err) { 
    console.error(err);
    fail('Network error. Please try again.'); 
  }

  function setHTMLWithScripts(target, html) {
    target.innerHTML = html;
    const scripts = target.querySelectorAll('script');
    scripts.forEach(oldScript => {
      const newScript = document.createElement('script');
      Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
      newScript.appendChild(document.createTextNode(oldScript.innerHTML));
      oldScript.parentNode.replaceChild(newScript, oldScript);
    });
  }

  async function renderPage(pageNum) {
    const adContainer = document.getElementById('adContainer');
    adContainer.innerHTML = 'Loading...';
    
    try {
      const res = await fetch(`/api/public/ad-placements/${pageNum}`);
      if (!res.ok) return;
      const { html, enabled } = await res.json();
      
      if (enabled && html) {
        setHTMLWithScripts(adContainer, html);
      } else {
        adContainer.innerHTML = '<div class="w-full h-full flex items-center justify-center text-gray-400 text-sm">Ad Space</div>';
      }
    } catch {
      adContainer.innerHTML = '';
    }
  }

  function showPage() {
    document.getElementById('statusCard').classList.add('hidden');
    document.getElementById('stepView').classList.remove('hidden');
    
    const content = blogContents[state.currentStep] || blogContents[1];
    document.getElementById('blogTitle').textContent = content.title;
    document.getElementById('blogAuthor').textContent = "By " + content.author;
    document.getElementById('blogDate').textContent = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    document.getElementById('blogPara1').textContent = content.p1;
    document.getElementById('blogPara2').textContent = content.p2;
    document.getElementById('blogPara3').textContent = content.p3;
    document.getElementById('blogPara4').textContent = content.p4;

    startTimer();
    
    // Attach event listener to the button
    document.getElementById('continueBtn').onclick = advance;

    window.scrollTo(0, 0);
  }

  function startTimer() {
    const timerLoader = document.getElementById('timerLoader');
    const timerMessage = document.getElementById('timerMessage');
    const continueBtnContainer = document.getElementById('continueBtnContainer');
    const continueBtn = document.getElementById('continueBtn');

    // Reset UI states
    timerLoader.classList.remove('hidden');
    timerMessage.textContent = "Please wait for the timer to finish.";
    timerMessage.className = "text-sm text-gray-500 font-normal mt-1";
    continueBtnContainer.classList.add('hidden');

    // 🔥 FIX: Button ko wapas enable karo aur text reset karo
    continueBtn.disabled = false;
    if (state.currentStep === state.totalSteps) {
      continueBtn.innerHTML = 'Unlock Final Page ➔';
    } else {
      continueBtn.innerHTML = 'Continue to Next Page ➔';
    }

    let timeLeft = 20;
    const countdownEl = document.getElementById('countdown');
    countdownEl.textContent = timeLeft;

    const timer = setInterval(() => {
      timeLeft--;
      countdownEl.textContent = timeLeft;
      
      if (timeLeft <= 0) {
        clearInterval(timer);
        
        timerLoader.classList.add('hidden'); 
        
        timerMessage.textContent = "Scroll down and click on continue button.";
        timerMessage.className = "text-sm text-green-600 font-bold mt-1";
        
        continueBtnContainer.classList.remove('hidden');
      }
    }, 1000);
  }

  async function advance() {
    const btn = document.getElementById('continueBtn');
    btn.disabled = true; 
    btn.innerHTML = 'Please wait…';

    try {
      const res = await fetch('/api/journey/continue', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ journeyId: state.journeyId, token: state.token })
      });
      const data = await res.json();
      if (!res.ok) return fail(data.error || 'Unable to continue.');

      if (data.done) {
        document.getElementById('stepView').classList.add('hidden');
        document.getElementById('statusCard').classList.remove('hidden');
        document.getElementById('statusCard').innerHTML = `
            <h1 class="text-[20px] font-bold text-green-600">Ads Completed!</h1>
            <p class="mt-2 text-sm text-gray-500">Taking you to final step...</p>
        `;
        setTimeout(() => {
          window.location.replace(`/landing.html?url=${encodeURIComponent(data.destinationUrl)}`);
        }, 800);

      } else {
        // data.nextStep backend se 1, 2, 3 aata hai. 
        // Agla page load karne ke liye hum +1 karte hain.
        state.currentStep = data.nextStep + 1; 
        state.token = data.token;
        
        await renderPage(state.currentStep);
        showPage();
      }
    } catch { fail('Network error.'); }
  }

  function fail(msg) {
    document.getElementById('statusCard').classList.remove('hidden');
    document.getElementById('statusCard').innerHTML = `<h1 class="text-[20px] font-bold text-red-600">Error</h1><p class="mt-2 text-sm text-gray-500">${msg}</p>`;
    document.getElementById('stepView').classList.add('hidden');
  }
})();