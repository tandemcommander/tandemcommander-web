// Engine - software rasteriser (demo content).
#include "renderer.h"

#include <algorithm>
#include <limits>

namespace engine
{

namespace
{
// Signed area of the parallelogram spanned by (b - a) and (p - a).
float Edge(const Vec3& a, const Vec3& b, float px, float py)
{
    return (px - a.x) * (b.y - a.y) - (py - a.y) * (b.x - a.x);
}
} // namespace

Renderer::Renderer(int width, int height)
    : Width(width), Height(height), Frame(width * height), Depth(width * height)
{
    Clear(0xFF101820);
}

void Renderer::Clear(std::uint32_t colour)
{
    std::fill(Frame.begin(), Frame.end(), colour);
    std::fill(Depth.begin(), Depth.end(), std::numeric_limits<float>::infinity());
}

void Renderer::Draw(const std::vector<Triangle>& mesh)
{
    for (const Triangle& t : mesh)
        Rasterise(t);
}

void Renderer::Rasterise(const Triangle& t)
{
    const int minX = std::max(0, static_cast<int>(std::min({t.a.x, t.b.x, t.c.x})));
    const int maxX = std::min(Width - 1, static_cast<int>(std::max({t.a.x, t.b.x, t.c.x})));
    const int minY = std::max(0, static_cast<int>(std::min({t.a.y, t.b.y, t.c.y})));
    const int maxY = std::min(Height - 1, static_cast<int>(std::max({t.a.y, t.b.y, t.c.y})));

    const float area = Edge(t.a, t.b, t.c.x, t.c.y);
    if (area == 0.0f)
        return; // degenerate triangle

    for (int y = minY; y <= maxY; ++y)
    {
        for (int x = minX; x <= maxX; ++x)
        {
            const float px = x + 0.5f, py = y + 0.5f;
            const float w0 = Edge(t.b, t.c, px, py) / area;
            const float w1 = Edge(t.c, t.a, px, py) / area;
            const float w2 = Edge(t.a, t.b, px, py) / area;
            if (w0 < 0 || w1 < 0 || w2 < 0)
                continue;

            const float z = w0 * t.a.z + w1 * t.b.z + w2 * t.c.z;
            const int index = y * Width + x;
            if (z < Depth[index])
            {
                Depth[index] = z;
                Frame[index] = t.colour;
            }
        }
    }
}

} // namespace engine
