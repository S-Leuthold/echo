import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * TodayPage is the main dashboard for daily focus.
 * Demonstrates layout, theming, and shadcn/ui Card usage.
 */
export default function TodayPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-text-primary mb-8">Today's Focus</h1>
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main Content Column */}
        <div className="w-full lg:w-2/3">
          <Card className="bg-background-secondary border-border-primary">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-text-primary">
                Tasks for Today
              </CardTitle>
              <CardDescription className="text-text-secondary">
                Here are the tasks you need to focus on.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-text-primary">
                This is where the list of today's tasks will be rendered.
                The entire system, from layout to theming to components, is now working.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar/Info Column */}
        <div className="w-full lg:w-1/3">
          <Card className="bg-background-secondary border-border-primary">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-text-primary">
                Quick Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-text-secondary">
                Placeholder for quick statistics or other relevant information.
                This card demonstrates the two-column layout.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
