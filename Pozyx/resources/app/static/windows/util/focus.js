export default function autofocus($refs, ref) {
  let input = null;

  $refs[ref].$el.childNodes.forEach((c) => {
    if (c._prevClass === 'input') {
      input = c;
    }
  });

  if (input) {
    input.focus();
  }
}
