// Light-theme and dark-theme versions of the logo; Tailwind's `dark:` variant
// (the same class ThemeContext puts on <html>) shows the right one.
export default function BrandLogo({ className = "", alt = "SplitEase", ...rest }) {
  return (
    <>
      <img src="/logo-icon-light.png" alt={alt} className={`${className} dark:hidden`} {...rest} />
      <img src="/logo-icon-dark.png" alt={alt} className={`${className} hidden dark:block`} {...rest} />
    </>
  );
}
