import css from './DishPhoto.module.css'

/** Small copy of a dish photo for cards (public/assets/thumbs/), same file name. */
const thumbOf = (src: string) => (src.startsWith('/assets/') && !src.startsWith('/assets/thumbs/') ? src.replace('/assets/', '/assets/thumbs/') : src)

/**
 * A dish photo that always shows the whole plate: the photo is fitted inside the frame and a
 * blurred copy fills the leftover space. The parent sets the size (and position: relative).
 */
export function DishPhoto({ src, alt, thumb = false }: { src: string; alt: string; thumb?: boolean }) {
  const url = thumb ? thumbOf(src) : src
  // fall back to the full photo if a thumbnail is missing (e.g. a newly added image)
  const onError = (e: React.SyntheticEvent<HTMLImageElement>) => { if (thumb && e.currentTarget.src.includes('/thumbs/')) e.currentTarget.src = src }
  return (
    <>
      <img className={css.bg} src={url} alt="" aria-hidden="true" loading={thumb ? 'lazy' : undefined} onError={onError} />
      <img className={css.fg} src={url} alt={alt} loading={thumb ? 'lazy' : undefined} onError={onError} />
    </>
  )
}
