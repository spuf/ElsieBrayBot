import Image from 'next/image'
import Link from 'next/link'
import avatar from '../../public/images/avatar.jpg'

export default function Index() {
  const size = 122
  return (
    <div className="center">
      <div
        style={{
          position: 'relative',
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: `${size / 2}px`,
          margin: '1em auto',
          overflow: 'hidden',
        }}
      >
        <Image src={avatar} alt="Avatar" placeholder="blur" layout="fill" objectFit="contain" />
      </div>

      <h1>ElsieBrayBot</h1>

      <p>
        <a href="https://t.me/ElsieBrayBot" target="_blank" rel="noreferrer">
          https://t.me/ElsieBrayBot
        </a>
      </p>
    </div>
  )
}
