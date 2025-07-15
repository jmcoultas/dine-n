import type { Meta, StoryObj } from '@storybook/react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card';
import { Button } from './button';

const meta = {
  title: 'UI/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card Description</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Card content goes here.</p>
      </CardContent>
      <CardFooter>
        <Button>Action</Button>
      </CardFooter>
    </Card>
  ),
};

export const WithoutFooter: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Simple Card</CardTitle>
        <CardDescription>This card has no footer</CardDescription>
      </CardHeader>
      <CardContent>
        <p>This is a simple card with just header and content.</p>
      </CardContent>
    </Card>
  ),
};

export const RecipeCard: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Spaghetti Carbonara</CardTitle>
        <CardDescription>Classic Italian pasta dish</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">🕒 30 minutes</p>
          <p className="text-sm text-muted-foreground">👥 4 servings</p>
          <p className="text-sm">A delicious and creamy pasta dish made with eggs, cheese, and pancetta.</p>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline">View Recipe</Button>
        <Button>Add to Plan</Button>
      </CardFooter>
    </Card>
  ),
};

export const MealPlanCard: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Weekly Meal Plan</CardTitle>
        <CardDescription>January 15-21, 2024</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm font-medium">Breakfast</span>
            <span className="text-sm text-muted-foreground">7 recipes</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm font-medium">Lunch</span>
            <span className="text-sm text-muted-foreground">7 recipes</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm font-medium">Dinner</span>
            <span className="text-sm text-muted-foreground">7 recipes</span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full">Generate Grocery List</Button>
      </CardFooter>
    </Card>
  ),
}; 