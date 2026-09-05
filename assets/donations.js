const DONATION_BUTTON_LABEL = 'Donate to The Blessing Fund'
const PRESET_AMOUNTS = [25, 50, 100]

const donationMarkup = `
  <div class="donation-dialog__backdrop" data-donation-close></div>
  <section class="donation-dialog__panel" role="dialog" aria-modal="true" aria-labelledby="donation-title">
    <button class="donation-dialog__close" type="button" aria-label="Close donation form" data-donation-close>×</button>
    <p class="donation-dialog__eyebrow">Secure giving</p>
    <h2 id="donation-title">Bless a senior today</h2>
    <p class="donation-dialog__intro">Your gift supports grocery, meal, and essential delivery services for low-income seniors in Central Iowa.</p>
    <form class="donation-form">
      <fieldset>
        <legend>Choose your donation</legend>
        <div class="donation-form__presets">
          ${PRESET_AMOUNTS.map(
            (amount) =>
              `<button type="button" data-donation-amount="${amount}" aria-pressed="false">$${amount}</button>`,
          ).join('')}
          <button type="button" data-donation-amount="custom" aria-pressed="false">Custom</button>
        </div>
      </fieldset>
      <label class="donation-form__custom" hidden>
        <span>Donation amount</span>
        <span class="donation-form__currency"><span>$</span><input name="amount" type="number" min="5" max="10000" step="1" inputmode="decimal" placeholder="75" /></span>
      </label>
      <label>
        <span>Email for receipt <em>(optional)</em></span>
        <input name="email" type="email" autocomplete="email" placeholder="you@example.com" />
      </label>
      <p class="donation-form__error" role="alert" hidden></p>
      <button class="donation-form__submit" type="submit" disabled>Continue to secure checkout</button>
      <p class="donation-form__note">Payments are securely processed by Stripe. Continued Blessing Senior Delivery is a for-profit LLC; gifts may not be tax deductible.</p>
    </form>
  </section>
`

const dialog = document.createElement('div')
dialog.className = 'donation-dialog'
dialog.hidden = true
dialog.innerHTML = donationMarkup
document.body.append(dialog)

const form = dialog.querySelector('.donation-form')
const customField = dialog.querySelector('.donation-form__custom')
const amountInput = form.elements.amount
const emailInput = form.elements.email
const submitButton = dialog.querySelector('.donation-form__submit')
const errorMessage = dialog.querySelector('.donation-form__error')
let selectedAmount = null
let previousFocus = null

const setError = (message = '') => {
  errorMessage.textContent = message
  errorMessage.hidden = !message
}

const chooseAmount = (choice) => {
  const isCustom = choice === 'custom'
  selectedAmount = isCustom ? null : Number(choice)
  customField.hidden = !isCustom
  amountInput.required = isCustom
  amountInput.value = isCustom ? amountInput.value : ''

  dialog.querySelectorAll('[data-donation-amount]').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.donationAmount === String(choice)))
  })

  submitButton.disabled = isCustom ? !amountInput.value : false
  setError()

  if (isCustom) {
    amountInput.focus()
  }
}

const openDialog = (trigger) => {
  previousFocus = trigger
  dialog.hidden = false
  document.body.classList.add('donation-dialog-open')
  dialog.querySelector('[data-donation-amount="50"]').focus()
}

const closeDialog = () => {
  dialog.hidden = true
  document.body.classList.remove('donation-dialog-open')
  setError()
  previousFocus?.focus()
}

dialog.addEventListener('click', (event) => {
  const amountButton = event.target.closest('[data-donation-amount]')

  if (amountButton) {
    chooseAmount(amountButton.dataset.donationAmount)
    return
  }

  if (event.target.closest('[data-donation-close]')) {
    closeDialog()
  }
})

amountInput.addEventListener('input', () => {
  submitButton.disabled = !amountInput.value
  setError()
})

dialog.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeDialog()
  }
})

form.addEventListener('submit', async (event) => {
  event.preventDefault()
  const amount = selectedAmount ?? Number(amountInput.value)

  if (!Number.isFinite(amount) || amount < 5 || amount > 10000) {
    setError('Choose an amount between $5 and $10,000.')
    return
  }

  submitButton.disabled = true
  submitButton.textContent = 'Opening secure checkout…'
  setError()

  try {
    const response = await fetch('/api/create-donation-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, email: emailInput.value }),
    })
    const result = await response.json()

    if (!response.ok || !result.url) {
      throw new Error(result.error || 'Unable to start checkout.')
    }

    window.location.assign(result.url)
  } catch (error) {
    setError(error.message || 'Unable to start checkout. Please try again.')
    submitButton.disabled = false
    submitButton.textContent = 'Continue to secure checkout'
  }
})

document.addEventListener(
  'click',
  (event) => {
    const button = event.target.closest('button')

    if (button?.textContent.trim() === DONATION_BUTTON_LABEL) {
      event.preventDefault()
      event.stopImmediatePropagation()
      openDialog(button)
    }
  },
  true,
)

const donationStatus = new URLSearchParams(window.location.search).get('donation')

if (donationStatus === 'success' || donationStatus === 'cancelled') {
  const notice = document.createElement('div')
  notice.className = `donation-notice donation-notice--${donationStatus}`
  notice.setAttribute('role', 'status')
  notice.innerHTML =
    donationStatus === 'success'
      ? '<strong>Thank you for your generosity.</strong><span>Your donation helps keep essential deliveries within reach for local seniors.</span>'
      : '<strong>Your donation was not completed.</strong><span>No charge was made. You can return whenever you are ready.</span>'
  document.body.append(notice)

  window.setTimeout(() => notice.remove(), 9000)
  history.replaceState({}, '', `${window.location.pathname}${window.location.hash}`)
}
