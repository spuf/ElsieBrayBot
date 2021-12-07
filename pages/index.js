import avatar from '../public/avatar.jpg'

export default function Index() {
  const size = 122
  return (
    <div className="center">
      <p>
        <img
          src={avatar.src}
          alt="ElsieBrayBot"
          style={{
            width: `${size}px`,
            height: `${size}px`,
            borderRadius: `${size / 2}px`,
          }}
        />
      </p>

      <h1>ElsieBrayBot</h1>

      <p>
        <a href="https://t.me/ElsieBrayBot" target="_blank" rel="noreferrer">
          https://t.me/ElsieBrayBot
        </a>
      </p>
    </div>
  )
}
