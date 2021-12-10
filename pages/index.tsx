import avatar from '../public/avatar.jpg'
import Image from 'next/image'
import Link from 'next/link'

export default function Index() {
  const size = 122
  return (
    <div className="center">
      <Link href="/guardian">
        <a>
          <div
            style={{
              width: `${size}px`,
              height: `${size}px`,
              borderRadius: `${size / 2}px`,
              margin: '1em auto',
              overflow: 'hidden',
            }}
          >
            <Image src={avatar} alt="Avatar" placeholder="blur" />
          </div>
        </a>
      </Link>

      <h1>ElsieBrayBot</h1>

      <p>
        <a href="https://t.me/ElsieBrayBot" target="_blank" rel="noreferrer">
          https://t.me/ElsieBrayBot
        </a>
      </p>
    </div>
  )
}
