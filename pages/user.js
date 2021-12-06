import { useSession, signIn, signOut, getProviders } from 'next-auth/react'

export default function User({ providers }) {
  const { data: session } = useSession()
  if (session) {
    return (
      <div>
        Signed in as {session.user.name} <br />
        <button onClick={() => signOut()}>Sign out</button>
      </div>
    )
  }
  return (
    <div>
      Not signed in <br />
      {Object.values(providers).map((provider) => (
        <div key={provider.name}>
          <button onClick={() => signIn(provider.id)}>Sign in with {provider.name}</button>
        </div>
      ))}
    </div>
  )
}

export async function getServerSideProps(context) {
  const providers = await getProviders()
  return {
    props: { providers },
  }
}
