// find HTTP URLs in a text and render them as links (<a> elements)
// (possible alternative: https://linkify.js.org/ ?)
const urlPattern = new RegExp('(?:https?|ftp)://[^\\s/$.?#]\\S*', 'ig');

export default function AutoLink({ text, linkClassName }) {
  const matches = text.matchAll(urlPattern);
  const result = [];
  let lastIndex = 0;
  let count = 0;

  for (const match of matches) {
    if (lastIndex < match.index) {
      result.push(text.substring(lastIndex, match.index));
    }
    const url = match[0];
    result.push((
      <a
        href={url}
        target="_blank"
        title="" // override title of parent
        rel="noreferrer noopener"
        className={linkClassName}
        onClick={(e) => e.stopPropagation()}
        key={`${count}-${url}`}
      >
        {url}
      </a>
    ));
    count++;
    lastIndex = match.index + url.length;
  }
  if (lastIndex < text.length) {
    result.push(text.substring(lastIndex));
  }

  return result;
}
