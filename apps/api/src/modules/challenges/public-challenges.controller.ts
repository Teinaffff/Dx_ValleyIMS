import { Controller, Get } from "@nestjs/common";
import { PrismaService } from "../../common/prisma.service";
import { Public } from "../../common/decorators/public.decorator";

@Public()
@Controller("public/challenges")
export class PublicChallengesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list() {
    const challenges = await this.prisma.innovationChallenge.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { deadline: "asc" },
      include: { _count: { select: { submissions: true } } },
    });

    const now = Date.now();
    return challenges.map((challenge) => ({
      id: challenge.id,
      title: challenge.title,
      slug: challenge.slug,
      description: challenge.description,
      problemStatement: challenge.problemStatement,
      eligibility: challenge.eligibility,
      evaluationCriteria: challenge.evaluationCriteria,
      submissionRequirements: challenge.submissionRequirements,
      startDate: challenge.startDate.toISOString(),
      deadline: challenge.deadline.toISOString(),
      daysLeft: Math.max(
        0,
        Math.ceil((challenge.deadline.getTime() - now) / 86_400_000),
      ),
      isOpen: challenge.deadline.getTime() >= now,
      submissionCount: challenge._count.submissions,
    }));
  }
}
