export function isBlank(value) {
  return !String(value || '').trim();
}

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

export function isValidPhone(value) {
  const digits = String(value || '').replace(/[^\d+]/g, '');
  return digits.length >= 7;
}

export function validateContactForm(form) {
  return firstError(validateContactFormFields(form));
}

export function validateLoginForm(form) {
  return firstError(validateLoginFormFields(form));
}

export function validateRegisterForm(form) {
  return firstError(validateRegisterFormFields(form));
}

export function validateBookingForm(form) {
  return firstError(validateBookingFormFields(form));
}

export function validateContactFormFields(form) {
  return compactErrors({
    name: isBlank(form.name) ? 'Enter your name' : '',
    email: isBlank(form.email)
      ? 'Enter your email'
      : !isValidEmail(form.email)
        ? 'Enter a valid email'
        : '',
    phone:
      !isBlank(form.phone) && !isValidPhone(form.phone)
        ? 'Enter a valid phone number'
        : '',
  });
}

export function validateLoginFormFields(form) {
  return compactErrors({
    email: isBlank(form.email)
      ? 'Enter your email'
      : !isValidEmail(form.email)
        ? 'Enter a valid email'
        : '',
    password: isBlank(form.password) ? 'Enter your password' : '',
  });
}

export function validateRegisterFormFields(form) {
  return compactErrors({
    name: isBlank(form.name) ? 'Enter your company or contact name' : '',
    email: isBlank(form.email)
      ? 'Enter your email'
      : !isValidEmail(form.email)
        ? 'Enter a valid email'
        : '',
    password:
      String(form.password || '').length < 6
        ? 'Password must be at least 6 characters'
        : '',
    company: isBlank(form.company) ? 'Select a partner type' : '',
    city: isBlank(form.city) ? 'Enter your city' : '',
    language: isBlank(form.language) ? 'Select a language' : '',
    tin: isBlank(form.tin) ? 'Enter your TIN' : '',
  });
}

export function validateBookingFormFields(form) {
  return compactErrors({
    sex: isBlank(form.sex) ? 'Enter gender' : '',
    firstName: isBlank(form.firstName) ? 'Enter first name' : '',
    lastName: isBlank(form.lastName) ? 'Enter last name' : '',
    travelDate: isBlank(form.travelDate) ? 'Select tour date' : '',
    adultCount: Number(form.adultCount) < 1 ? 'Enter number of adults' : '',
    childCount: Number(form.childCount) < 0 ? 'Enter number of children' : '',
    phone: isBlank(form.phone)
      ? 'Enter phone number'
      : !isValidPhone(form.phone)
        ? 'Enter a valid phone number'
        : '',
    email: isBlank(form.email)
      ? 'Enter your email'
      : !isValidEmail(form.email)
        ? 'Enter a valid email'
        : '',
  });
}

function compactErrors(errors) {
  return Object.fromEntries(Object.entries(errors).filter(([, value]) => value));
}

function firstError(errors) {
  return Object.values(errors)[0] || null;
}
