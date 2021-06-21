export default function CreateError(): JSX.Element {
  return (
    <div>
      <button
        onClick={() => {
          if (window.confirm('Cause an error?')) {
            throw Error('You caused an error!')
          }
        }}
      >
        Create an Error
      </button>
    </div>
  )
}
