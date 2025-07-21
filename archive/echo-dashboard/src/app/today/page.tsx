import Card from '../../components/ui/Card';

function CurrentSessionCard() {
  return (
    <Card>
      <h1 className="text-xl font-semibold text-zinc-100">Deep Work: Echo | Prompt Development</h1>
      <p className="text-sm text-zinc-400 mt-1">09:00 - 11:00</p>
      <button className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-500 transition-colors mt-6">Start Session</button>
    </Card>
  );
}

function NotesCard() {
  return (
    <Card>
      <h2 className="text-lg font-medium text-zinc-200 mb-3">Notes</h2>
      <textarea
        className="bg-zinc-900 border border-zinc-700 rounded-lg p-2 w-full text-zinc-100 mb-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        placeholder="Quick notes..."
      />
      <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-500 transition-colors">Save Note</button>
    </Card>
  );
}

function Timeline() {
  const events = [
    { time: '08:00', label: 'Morning Routine', color: 'bg-blue-500' },
    { time: '09:00', label: 'Deep Work: Echo | Prompt Development', color: 'bg-green-500' },
    { time: '11:00', label: 'Team Standup', color: 'bg-yellow-400' },
    { time: '12:00', label: 'Lunch', color: 'bg-pink-400' },
    { time: '13:00', label: 'Project: Personal | Writing', color: 'bg-purple-500' },
    { time: '15:00', label: 'Email & Admin', color: 'bg-zinc-500' },
  ];
  return (
    <Card>
      <h2 className="text-base font-medium text-zinc-200 mb-5">Friday, July 18, 2025</h2>
      <ul className="space-y-4">
        {events.map((event, i) => (
          <li key={i} className="flex gap-3">
            <div className={`w-1 h-10 ${event.color} rounded-full`} />
            <div>
              <p className="text-sm text-zinc-500">{event.time}</p>
              <p className="text-sm text-zinc-100">{event.label}</p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default function TodayPage() {
  return (
    <main className="p-8">
      <div className="flex gap-8">
        {/* Left Column */}
        <div className="w-2/3 flex flex-col gap-8">
          <CurrentSessionCard />
          <NotesCard />
        </div>
        {/* Right Column */}
        <div className="w-1/3">
          <Timeline />
        </div>
      </div>
    </main>
  );
} 